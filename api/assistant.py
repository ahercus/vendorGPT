import os
import json
import time
from http.server import BaseHTTPRequestHandler
import openai

# Set the OpenAI API key
openai.api_key = os.getenv("OPENAI_API_KEY")

def create_knowledge_file():
    print("Creating knowledge file...")  # Debug log
    knowledge_text = """
    # Dave's Hot Chicken Knowledge Base

    ## Origin Story
    • Founded in 2017 in an East Hollywood parking lot by four friends
    • Started with just $900 to buy a fryer
    • Founders: Dave Kopushyan, Arman Oganesyan, Tommy and Gary Rubenyan
    • Grew from parking lot pop-up to fast-casual phenomenon
    • Backed by celebrity investors including Drake and Samuel L. Jackson

    ## Growth & Success
    • Expanded from 7 stores in 2021 to over 200 locations by 2023
    • Achieved 156% sales growth in 2022
    • Average unit volumes of $2.7 million
    • Opening approximately 7 new locations weekly
    • Plans for 1,000 locations in development globally

    ## Brand Identity
    • Nashville-style hot chicken with seven spice levels
    • Simple, focused menu: tenders, sliders, fries
    • Authentic street food roots with hip-hop culture influence
    • Strong social media presence with 2M+ TikTok followers
    • Attracts young, affluent demographic

    ## Market Position
    • Taking market share from established players like Chick-fil-A
    • Customers spending 6x more at Dave's compared to 2021
    • Present in major markets: LA, Chicago, Dallas, Houston, Toronto
    • International presence including Dubai and Canada
    • Customers reduced Chick-fil-A spending by 10% (65.4% to 54.3%)

    ## Business Approach
    • Focus on authenticity and quality over traditional business plans
    • Emphasis on word-of-mouth and social media marketing
    • High-traffic location strategy
    • Strong franchise growth model with careful market selection
    • Technology partnerships with QSR Automations, Ovation, and Qu
    """
    try:
        file = openai.File.create(
            file=knowledge_text.encode(),
            purpose='assistants'
        )
        print(f"Created file with ID: {file.id}")  # Debug log
        return file.id
    except Exception as e:
        print(f"Error creating file: {e}")  # Debug log
        raise e

def initialize_assistant():
    print("Initializing assistant...")  # Debug log
    try:
        # Create a chat completion
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are Dave, the voice of Dave's Hot Chicken..."}
            ]
        )
        
        print("Assistant initialized successfully.")  # Debug log
        return response
    except Exception as e:
        print(f"Error initializing assistant: {e}")  # Debug log
        raise e

# Initialize the assistant when the module loads
try:
    print("Starting assistant initialization...")  # Debug log
    initialize_assistant()
    print("Successfully initialized assistant.")  # Debug log
except Exception as e:
    print(f"Failed to initialize assistant: {e}")  # Debug log
    raise e

class Handler(BaseHTTPRequestHandler):
    thread_id = None

    def handle_error(self, e):
        error_details = {
            "error": str(e),
            "type": str(type(e)),
            "assistant_id": ASSISTANT_ID,
            "thread_id": self.thread_id
        }
        print(f"Full error details: {json.dumps(error_details)}")
        
        self.send_response(500)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(error_details).encode())

    def do_POST(self):
        try:
            print(f"Handling POST request with ASSISTANT_ID: {ASSISTANT_ID}")  # Debug log
            
            # Read the request
            content_length = int(self.headers['Content-Length'])
            request_body = self.rfile.read(content_length).decode('utf-8')
            request_data = json.loads(request_body)
            message = request_data.get('message', '')
            
            if not ASSISTANT_ID:
                raise ValueError("Assistant not properly initialized")
            
            # Create thread if needed
            if not Handler.thread_id:
                thread = openai.Thread.create()
                Handler.thread_id = thread.id
            
            # Add message to thread
            openai.ThreadMessage.create(
                thread_id=Handler.thread_id,
                role="user",
                content=message
            )
            
            # Run assistant
            run = openai.ThreadRun.create(
                thread_id=Handler.thread_id,
                assistant_id=ASSISTANT_ID
            )
            
            # Wait for completion
            start_time = time.time()
            while time.time() - start_time < 25:
                run = openai.ThreadRun.retrieve(
                    thread_id=Handler.thread_id,
                    run_id=run.id
                )
                if run.status == "completed":
                    messages = openai.ThreadMessage.list(
                        thread_id=Handler.thread_id
                    )
                    response = messages.data[0].content[0].text.value
                    
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps({"response": response}).encode())
                    return
                time.sleep(1)
            
            raise TimeoutError("Assistant took too long to respond")
            
        except Exception as e:
            print(f"Error in request handler: {str(e)}")  # Debug log
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        if self.path == '/debug':
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            check_assistant_files()
            self.wfile.write(b"Check your server logs for debug info")
        elif self.path == '/status':
            try:
                status = check_assistant_status()
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(status, indent=2).encode())
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode())

def check_assistant_files():
    try:
        assistant = openai.Assistant.retrieve("asst_xg9VQ02YB5vqjuc3cnAxQrcj")
        print("\nAssistant Configuration:")
        print(f"Name: {assistant.name}")
        print(f"Model: {assistant.model}")
        print(f"Instructions length: {len(assistant.instructions)} chars")
        
        print("\nAttached Files:")
        if not assistant.file_ids:
            print("No files attached!")
            return
            
        for file_id in assistant.file_ids:
            try:
                file = openai.File.retrieve(file_id)
                print(f"\nFile: {file.filename}")
                print(f"ID: {file.id}")
                print(f"Created: {file.created_at}")
                print(f"Size: {file.bytes} bytes")
            except Exception as e:
                print(f"Error retrieving file {file_id}: {e}")
                
    except Exception as e:
        print(f"Error checking assistant: {e}")

def check_assistant_status():
    try:
        assistant = openai.Assistant.retrieve(ASSISTANT_ID)
        status = {
            "id": assistant.id,
            "name": assistant.name,
            "model": assistant.model,
            "file_count": len(assistant.file_ids),
            "files": []
        }
        
        # Get details of each file
        for file_id in assistant.file_ids:
            try:
                file = openai.File.retrieve(file_id)
                status["files"].append({
                    "name": file.filename,
                    "id": file.id,
                    "created": file.created_at
                })
            except Exception as e:
                status["files"].append({
                    "error": f"Could not retrieve file {file_id}: {str(e)}"
                })
                
        return status
    except Exception as e:
        return {"error": f"Could not retrieve assistant: {str(e)}"} 