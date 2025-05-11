from http.server import BaseHTTPRequestHandler
import json

def handler(request, response):
    response.statusCode = 200
    response.setHeader('Content-Type', 'application/json')
    response.end(json.dumps({
        'message': 'Hello Vercel!',
        'path': request.url
    })) 