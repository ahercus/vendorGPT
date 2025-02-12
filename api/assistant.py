import os
import json
import time
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
    
    if not api_key:
        raise ValueError("OPENAI_API_KEY environment variable is not set")
    if not assistant_id:
        raise ValueError("ASSISTANT_ID environment variable is not set")
    
    # Initialize client with fresh API key
    client = OpenAI(
        api_key=api_key,
        max_retries=3,
        timeout=30.0
    )
    
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

# Global variables for error tracking
INIT_ERROR = None
try:
    client, ASSISTANT_ID = verify_credentials()
except Exception as e:
    INIT_ERROR = str(e)
    print(f"Initialization error: {INIT_ERROR}")

# Store thread ID in a global variable for Vercel
THREAD_ID = None

def handler(request):
    global THREAD_ID
    
    # Check for initialization errors
    if INIT_ERROR:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': {
                    'message': f'Server initialization failed: {INIT_ERROR}',
                    'type': 'InitializationError'
                }
            })
        }
    
    print("\n=== Starting Request Handler ===")
    print(f"Request method: {request.method}")
    print(f"Request headers: {dict(request.headers)}")
    
    # Handle OPTIONS request
    if request.method == 'OPTIONS':
        print("Handling OPTIONS request")
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            }
        }
    
    # Handle POST request
    if request.method == 'POST':
        try:
            print("\n=== Processing POST Request ===")
            body = json.loads(request.body)
            print(f"Request body: {json.dumps(body, indent=2)}")
            message = body.get('message')
            
            if not message:
                raise ValueError("Message is required")
            
            print(f"\n=== OpenAI Configuration ===")
            print(f"Assistant ID: {ASSISTANT_ID}")
            print(f"Thread ID: {THREAD_ID}")
            
            # Create thread if needed
            if not THREAD_ID:
                print("Creating new thread...")
                thread = client.beta.threads.create()
                THREAD_ID = thread.id
            
            # Add message to thread
            print("\n=== Adding Message to Thread ===")
            message_obj = client.beta.threads.messages.create(
                thread_id=THREAD_ID,
                role="user",
                content=message
            )
            
            # Run assistant
            print("\n=== Starting Assistant Run ===")
            run = client.beta.threads.runs.create(
                thread_id=THREAD_ID,
                assistant_id=ASSISTANT_ID
            )
            
            # Wait for completion (reduced timeout for Vercel)
            start_time = time.time()
            while time.time() - start_time < 10:  # Reduced timeout for Vercel
                run_status = client.beta.threads.runs.retrieve(
                    thread_id=THREAD_ID,
                    run_id=run.id
                )
                print(f"Run status: {run_status.status}")
                
                if run_status.status == "completed":
                    print("\n=== Getting Response ===")
                    messages = client.beta.threads.messages.list(
                        thread_id=THREAD_ID
                    )
                    response = messages.data[0].content[0].text.value
                    print(f"Response preview: {response[:100]}...")
                    return {
                        'statusCode': 200,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({
                            'response': clean_response(response)
                        })
                    }
                elif run_status.status == "failed":
                    print(f"\n=== Run Failed ===\n{run_status.last_error}")
                    raise Exception(f"Run failed: {run_status.last_error}")
                time.sleep(1)
            
            raise TimeoutError("Assistant took too long to respond")
            
        except Exception as e:
            print(f"\n=== Error in Handler ===")
            print(f"Error type: {type(e).__name__}")
            print(f"Error message: {str(e)}")
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'error': {
                        'message': str(e),
                        'type': str(type(e).__name__)
                    }
                })
            }

def clean_response(text):
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