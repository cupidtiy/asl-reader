#!/usr/bin/env python3
"""
Simple server for ASL Gesture App with training data saving capability
Provides endpoints for loading and saving training data to disk
Run with: python3 server.py
"""

import os
import json
import http.server
import socketserver
from datetime import datetime
from urllib.parse import urlparse, parse_qs

# Configuration
PORT = 8000
TRAINING_DATA_DIR = "training-data"  # Directory to store training samples

class ASLRequestHandler(http.server.SimpleHTTPRequestHandler):
    """
    Custom request handler extending SimpleHTTPRequestHandler
    Adds API endpoints for training data management
    """
    
    def do_GET(self):
        """Handle GET requests"""
        if self.path == '/api/training-data/load':
            # API endpoint to load all training data from disk
            try:
                # Collect all training data from the training-data directory
                all_training_data = {}
                
                if os.path.exists(TRAINING_DATA_DIR):
                    # Iterate through gesture folders
                    for gesture_folder in os.listdir(TRAINING_DATA_DIR):
                        gesture_path = os.path.join(TRAINING_DATA_DIR, gesture_folder)
                        
                        if os.path.isdir(gesture_path):
                            # Convert folder name back to gesture name (underscore to slash)
                            gesture_name = gesture_folder.replace('_', '/')
                            all_training_data[gesture_name] = []
                            
                            # Read all JSON files in the gesture folder
                            for filename in os.listdir(gesture_path):
                                if filename.endswith('.json'):
                                    filepath = os.path.join(gesture_path, filename)
                                    try:
                                        with open(filepath, 'r') as f:
                                            data = json.load(f)
                                            # Extract landmarks array from saved data
                                            if 'landmarks' in data:
                                                all_training_data[gesture_name].append(data['landmarks'])
                                    except Exception as e:
                                        print(f"Error reading {filepath}: {e}")
                
                # Send successful response with training data
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')  # CORS header
                self.end_headers()
                self.wfile.write(json.dumps(all_training_data).encode())
                
            except Exception as e:
                # Send error response
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode())
        else:
            # Default file serving for static files
            super().do_GET()
    
    def do_POST(self):
        """Handle POST requests"""
        if self.path == '/api/training-data':
            # API endpoint to save training data
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                # Parse JSON data from request
                data = json.loads(post_data)
                gesture = data.get('gesture', 'unknown')
                timestamp = data.get('timestamp', datetime.now().isoformat())
                
                # Create gesture directory if it doesn't exist
                # Replace slash with underscore for filesystem compatibility
                gesture_dir = os.path.join(TRAINING_DATA_DIR, gesture.replace('/', '_'))
                os.makedirs(gesture_dir, exist_ok=True)
                
                # Save the sample with timestamp in filename
                # Replace colons in timestamp for filesystem compatibility
                filename = f"{gesture}_{timestamp.replace(':', '-')}.json"
                filepath = os.path.join(gesture_dir, filename)
                
                # Write JSON data to file with pretty formatting
                with open(filepath, 'w') as f:
                    json.dump(data, f, indent=2)
                
                # Send success response
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'success': True, 'file': filepath}).encode())
                
            except Exception as e:
                # Send error response
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode())
        else:
            # Unknown endpoint
            self.send_response(404)
            self.end_headers()
    
    def do_OPTIONS(self):
        """Handle preflight CORS requests"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

if __name__ == "__main__":
    # Create training data directory if it doesn't exist
    os.makedirs(TRAINING_DATA_DIR, exist_ok=True)
    
    # Set up and start the server
    Handler = ASLRequestHandler
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Server running at http://localhost:{PORT}/")
        print(f"Training data will be saved to: {os.path.abspath(TRAINING_DATA_DIR)}/")
        print("Press Ctrl-C to stop")
        
        # Run server until interrupted
        httpd.serve_forever()