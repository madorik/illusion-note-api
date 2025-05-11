from http.server import BaseHTTPRequestHandler
import json

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        
        response = {
            'status': 'healthy',
            'message': 'API is running properly'
        }
        
        self.wfile.write(json.dumps(response).encode())
        return

handler = Handler 