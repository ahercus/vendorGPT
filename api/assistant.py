import os
import json
import time
from http.server import BaseHTTPRequestHandler
from openai import OpenAI
import sys
from dotenv import load_dotenv
import re

def verify_credentials():
    """Verify API key and Assistant ID before starting server"""
    print("\n=== Verifying Credentials ===")
    
    # Reload environment variables
    load_dotenv(override=True)
    
    # Get credentials
    api_key = os.getenv("OPENAI_API_KEY")
    assistant_id = os.getenv("ASSISTANT_ID")
    
    # Initialize client with fresh API key
    client = OpenAI(api_key=api_key)
    
    # Check API Key
    print("\nChecking API Key...")
    try:
        # Try to list models as a simple API check
        models = client.models.list()
        print("✓ API Key is valid")
    except Exception as e:
        print("✗ API Key verification failed!")
        print(f"Error: {str(e)}")
        sys.exit(1)
    
    # Check Assistant ID
    print("\nChecking Assistant ID...")
    try:
        # Verify assistant exists by attempting to retrieve it
        assistant = client.beta.assistants.retrieve(assistant_id)
        if assistant:
            print("✓ Assistant ID is valid")
            print("\n=== Assistant Configuration ===")
            print(f"Name: {assistant.name}")
            print(f"Model: {assistant.model}")
            
            # Check for retrieval capability
            has_retrieval = any(tool.type in ["retrieval", "file_search"] for tool in assistant.tools)
            print(f"\nRetrieval Status:")
            if has_retrieval:
                print("  ✓ Retrieval enabled")
            else:
                print("  ✗ Retrieval disabled")
            
            print(f"Tools enabled:")
            for tool in assistant.tools:
                print(f"  - {tool.type}")
            
            # Check for knowledge base files
            if hasattr(assistant, 'files') and assistant.files:
                print(f"\nKnowledge Base:")
                print(f"  ✓ {len(assistant.files)} files attached")
                for file in assistant.files:
                    try:
                        print(f"    - {file.filename} ({file.bytes} bytes)")
                    except Exception as e:
                        print(f"    - {file.id} (Unable to retrieve file details)")
            else:
                print("\nKnowledge Base:")
                print("  ✗ No files attached")
            
            print("\nInstructions:")
            if hasattr(assistant, 'instructions') and assistant.instructions:
                print(f"  {assistant.instructions[:200]}...")
            else:
                print("  No custom instructions")
            return client, assistant_id
    except Exception as e:
        print("✗ Assistant verification failed!")
        print(f"Error: {str(e)}")
        sys.exit(1)

# Get verified client and assistant ID
client, ASSISTANT_ID = verify_credentials()

class Handler:
    thread_id = None

    def __init__(self, rfile, wfile, headers):
        self.rfile = rfile
        self.wfile = wfile
        self.headers = headers
        self.path = None  # Will be set by the server

    def _write_response(self, status_code, headers, body=None):
        # Write status line
        self.wfile.write(f"HTTP/1.1 {status_code}\r\n".encode('utf-8'))
        
        # Write headers
        for key, value in headers.items():
            self.wfile.write(f"{key}: {value}\r\n".encode('utf-8'))
        
        # Write blank line
        self.wfile.write(b"\r\n")
        
        # Write body if present
        if body:
            self.wfile.write(body.encode('utf-8'))

    def _send_json_response(self, status_code, data):
        body = json.dumps(data)
        headers = {
            'Content-Type': 'application/json',
            'Content-Length': str(len(body)),
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
        self._write_response(status_code, headers, body)

    def handle_error(self, e):
        error_details = {
            "error": str(e),
            "type": str(type(e).__name__),
            "assistant_id": ASSISTANT_ID,
            "thread_id": self.thread_id
        }
        print(f"Full error details: {json.dumps(error_details)}")
        # Always include CORS headers even in error responses
        headers = {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
        body = json.dumps(error_details)
        self._write_response(500, headers, body)

    def _parse_multipart(self, content_type, content_length):
        """Parse multipart form data"""
        import cgi
        environ = {
            'REQUEST_METHOD': 'POST',
            'CONTENT_TYPE': content_type,
            'CONTENT_LENGTH': content_length,
            'PATH_INFO': self.path,  # Add path info
            'SCRIPT_NAME': '',
            'SERVER_NAME': 'localhost',
            'SERVER_PORT': '3001',
            'SERVER_PROTOCOL': 'HTTP/1.1'
        }
        form = cgi.FieldStorage(
            fp=self.rfile,
            headers=self.headers,
            environ=environ
        )
        return form

    def do_POST(self):
        try:
            print(f"\n=== Handling POST request to {self.path} ===")
            print(f"Headers: {dict(self.headers)}")
            print(f"Path before processing: {self.path}")
            
            # Handle both /api/upload and /api/assistant paths
            if not self.path.startswith('/api/'):
                raise ValueError(f"Invalid path: {self.path}")
            
            # More robust endpoint extraction
            endpoint = self.path.split('/')[-1]  # Get last part of path
            print(f"Endpoint after processing: {endpoint}")
            print(f"Content-Type: {self.headers.get('Content-Type', 'none')}")
            
            if endpoint == 'upload':
                print("Processing file upload...")
                
                content_type = self.headers.get('Content-Type', '')
                content_length = int(self.headers.get('Content-Length', 0))
                
                if content_length == 0:
                    raise ValueError("No content received")
                
                form = self._parse_multipart(content_type, content_length)
                
                if 'file' not in form:
                    raise ValueError("No file part")
                
                file_item = form['file']
                if not file_item.filename:
                    raise ValueError("No selected file")
                
                print(f"Processing file: {file_item.filename}")
                
                try:
                    # Upload file to OpenAI using files API
                    file_obj = client.files.create(
                        file=file_item.file,
                        purpose='assistants'
                    )
                    print(f"File uploaded to OpenAI: {file_obj.id}")
                    
                    # Attach file to the assistant
                    client.beta.assistants.files.create(
                        assistant_id=ASSISTANT_ID,
                        file_id=file_obj.id
                    )
                    print(f"File attached to assistant: {ASSISTANT_ID}")
                    
                    response_data = {
                        'success': True,
                        'file_id': file_obj.id,
                        'filename': file_item.filename
                    }
                    self._send_json_response(200, response_data)
                    return
                except Exception as e:
                    print(f"File upload error: {str(e)}")
                    error_response = {
                        'error': str(e),
                        'filename': file_item.filename
                    }
                    self._send_json_response(400, error_response)
                    return
            elif endpoint == 'assistant':  # Simplified comparison
                print(f"\n=== Starting new request ===")
                
                # Read request body
                content_length = int(self.headers.get('Content-Length', 0))
                if content_length == 0:
                    raise ValueError("Empty request body")
                
                body = self.rfile.read(content_length)
                data = json.loads(body)
                message = data.get('message', '')
                
                if not message:
                    raise ValueError("Message is required")
                
                if not ASSISTANT_ID:
                    raise ValueError("Assistant not properly initialized")
                
                # Check for active runs on the thread
                if Handler.thread_id:
                    try:
                        runs = client.beta.threads.runs.list(
                            thread_id=Handler.thread_id
                        )
                        active_runs = [run for run in runs.data if run.status in ["queued", "in_progress", "requires_action"]]
                        if active_runs:
                            # Cancel active runs
                            for run in active_runs:
                                try:
                                    client.beta.threads.runs.cancel(
                                        thread_id=Handler.thread_id,
                                        run_id=run.id
                                    )
                                except Exception as e:
                                    print(f"Failed to cancel run {run.id}: {str(e)}")
                    except Exception as e:
                        print(f"Failed to check runs: {str(e)}")
                        # If we can't check runs, create a new thread to be safe
                        Handler.thread_id = None
                
                # Create thread if needed
                if not Handler.thread_id:
                    thread = client.beta.threads.create()
                    Handler.thread_id = thread.id
                
                # Add message to thread
                print("\n=== Adding Message ===")
                message_obj = client.beta.threads.messages.create(
                    thread_id=Handler.thread_id,
                    role="user",
                    content=message
                )
                print(f"Added message to thread: {message_obj.id}")
                print(f"Message content: {message[:100]}...")
                
                # Debug: Log payload before run creation
                print("\n=== Creating Run ===")
                print(f"Thread ID: {Handler.thread_id}")
                print(f"Assistant ID: {ASSISTANT_ID}")
                
                # Run assistant
                run = client.beta.threads.runs.create(
                    thread_id=Handler.thread_id,
                    assistant_id=ASSISTANT_ID
                )
                print(f"Started run: {run.id}")
                
                # Wait for completion
                print("\n=== Waiting for Response ===")
                start_time = time.time()
                while time.time() - start_time < 60:
                    run_status = client.beta.threads.runs.retrieve(
                        thread_id=Handler.thread_id,
                        run_id=run.id
                    )
                    print(f"Run status: {run_status.status}")
                    
                    if run_status.status == "completed":
                        messages = client.beta.threads.messages.list(
                            thread_id=Handler.thread_id
                        )
                        response = messages.data[0].content[0].text.value
                        # Remove source citations
                        response = self.clean_response(response)
                        print(f"\n=== Got Response ===")
                        print(f"Response preview: {response[:100]}...")
                        self._send_json_response(200, {"response": response})
                        return
                    elif run_status.status == "failed":
                        error_msg = f"Run failed: {run_status.last_error}"
                        print(f"\n=== Run Failed ===")
                        print(error_msg)
                        raise Exception(error_msg)
                    time.sleep(1)
                
                raise TimeoutError("Assistant took too long to respond")
                
            else:
                raise ValueError(f"Unknown endpoint: {endpoint}")
            
        except Exception as e:
            print(f"\n=== Error Occurred ===")
            print(f"Error in request handler: {str(e)}")
            self.handle_error(e)

    def do_OPTIONS(self):
        headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Content-Length': '0'
        }
        self._write_response(200, headers)

    def do_GET(self):
        if self.path == '/status':
            try:
                status = self.check_assistant_status()
                self._send_json_response(200, status)
            except Exception as e:
                self.handle_error(e)

    def check_assistant_status(self):
        try:
            assistant = client.beta.assistants.retrieve(ASSISTANT_ID)
            return {
                "id": assistant.id,
                "name": assistant.name,
                "model": assistant.model,
                "status": "active"
            }
        except Exception as e:
            return {"error": f"Could not retrieve assistant: {str(e)}"}

    def clean_response(self, text):
        """Remove source citations from the response while preserving formatting"""
        # Remove citations like 【8:0†Marketing summary.json】
        cleaned = re.sub(r'【[^】]+】', '', text)
        
        # Convert markdown bold to HTML
        cleaned = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', cleaned)
        
        # Split into paragraphs, preserving numbered lists
        paragraphs = []
        current_paragraph = []
        
        for line in cleaned.split('\n'):
            line = line.strip()
            if not line:  # Empty line indicates paragraph break
                if current_paragraph:
                    paragraphs.append(' '.join(current_paragraph))
                    current_paragraph = []
            else:
                # Check if line starts with a number or bullet
                if re.match(r'^\d+\.|^- ', line):  # Match numbers and dashes
                    # If we have a previous paragraph, save it
                    if current_paragraph:
                        paragraphs.append(' '.join(current_paragraph))
                        current_paragraph = []
                    # Add the list item as its own paragraph
                    # Add proper HTML list formatting
                    if line.startswith('- '):
                        line = '• ' + line[2:]  # Replace dash with bullet
                    paragraphs.append(line)
                else:
                    current_paragraph.append(line)
        
        # Add any remaining paragraph
        if current_paragraph:
            paragraphs.append(' '.join(current_paragraph))
        
        # Rejoin with proper spacing
        cleaned = '\n\n'.join(p for p in paragraphs if p.strip())
        
        return cleaned 