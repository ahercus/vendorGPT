from http.server import HTTPServer, BaseHTTPRequestHandler
from api.assistant import Handler, verify_credentials
import os
import socket
from dotenv import load_dotenv
import time
import json

# Load environment variables
load_dotenv()

class RequestHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/':
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            with open('index.html', 'rb') as f:
                self.wfile.write(f.read())
        elif self.path == '/style.css':
            self.send_response(200)
            self.send_header('Content-type', 'text/css')
            self.end_headers()
            with open('style.css', 'rb') as f:
                self.wfile.write(f.read())
        elif self.path.startswith('/api/'):
            # Handle API requests through the Handler class
            handler = Handler(self.rfile, self.wfile, self.headers)
            print(f"Routing API request to: {self.path}")
            if self.path == '/api/status':
                handler.do_GET()
        else:
            self.send_error(404)

    def do_POST(self):
        if self.path.startswith('/api/'):
            print(f"Routing POST request to: {self.path}")
            # Create a new handler for each request
            handler = Handler(self.rfile, self.wfile, self.headers)
            try:
                # Pass the full path to the handler
                handler.path = self.path  # Add this line to set the path
                handler.do_POST()
            except Exception as e:
                # Return JSON error instead of HTML 404
                error_response = {
                    'error': str(e),
                    'path': self.path
                }
                self.send_response(404)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
                self.send_header('Access-Control-Allow-Headers', 'Content-Type')
                self.end_headers()
                self.wfile.write(json.dumps(error_response).encode('utf-8'))
        else:
            print(f"404 for path: {self.path}")
            self._send_json_error(404, "Path not found")

    def do_OPTIONS(self):
        if self.path.startswith('/api/'):
            handler = Handler(self.rfile, self.wfile, self.headers)
            handler.do_OPTIONS()
        else:
            self.send_error(404)

    def send_error(self, code, message=None):
        headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
        self.send_response(code)
        for key, value in headers.items():
            self.send_header(key, value)
        self.send_header('Content-type', 'text/plain')
        self.end_headers()
        if message:
            self.wfile.write(message.encode('utf-8'))

    def _send_json_error(self, code, message):
        error_response = {
            'error': message,
            'path': self.path
        }
        self.send_response(code)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(json.dumps(error_response).encode('utf-8'))

def is_port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(('', port))
            return False
        except OSError:
            return True

def find_available_port(start_port=3000, max_attempts=20):
    for port in range(start_port, start_port + max_attempts):
        if not is_port_in_use(port):
            return port
    raise OSError(f"No available ports found between {start_port} and {start_port + max_attempts}")

def run(server_class=HTTPServer, handler_class=RequestHandler):
    max_retries = 3
    retry_delay = 2

    for attempt in range(max_retries):
        try:
            port = find_available_port()
            server_address = ('', port)
            httpd = server_class(server_address, handler_class)
            print(f"\nServer started successfully!")
            print(f"Access the assistant at: http://localhost:{port}")
            print("Press Ctrl+C to stop the server")
            httpd.serve_forever()
            break
        except OSError as e:
            if attempt < max_retries - 1:
                print(f"Attempt {attempt + 1} failed. Retrying in {retry_delay} seconds...")
                time.sleep(retry_delay)
            else:
                print(f"Failed to start server after {max_retries} attempts.")
                print("Error:", str(e))
                print("\nTroubleshooting steps:")
                print("1. Try manually killing Python processes:")
                print("   ps aux | grep python")
                print("2. Or restart your terminal")
                print("3. Or try a different port range by modifying start_port in find_available_port()")
                raise e
        except KeyboardInterrupt:
            print("\nShutting down server...")
            httpd.server_close()
            break

def main():
    print("\n=== Starting Server ===")
    
    # Verify credentials before starting server
    try:
        # This will reload environment variables and verify credentials
        verify_credentials()
    except SystemExit:
        print("\nFailed to verify credentials. Please check your API key and Assistant ID.")
        return
    except Exception as e:
        print(f"\nUnexpected error during verification: {str(e)}")
        return
    
    # Continue with server startup
    run()

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\nServer shutdown complete") 