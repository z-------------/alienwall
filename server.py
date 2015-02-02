#!/usr/bin/env python3

import sys
from http.server import CGIHTTPRequestHandler, HTTPServer
import os

os.chdir("public")
 
port = 8000
if len(sys.argv) > 1:
    port = int(sys.argv[1])
 
handler = CGIHTTPRequestHandler
handler.cgi_directories = ["/py"] 
server = HTTPServer(("", port), handler)
 
print("Server running on port " + str(port))
 
server.serve_forever()
