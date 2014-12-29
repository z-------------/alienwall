#!/usr/bin/env python3

import cgi
import urllib.parse
import urllib.request
import base64
import json

form = cgi.FieldStorage()

code = form["code"].value

url = "https://www.reddit.com/api/v1/access_token"
values = {
    "grant_type": "authorization_code",
    "code": code,
    "redirect_uri": "http://localhost:8000/py/auth_callback.py"
}

password_str = base64.b64encode(b"ntFDwUGcEC-X4A:XWCtr0HSC-E2tKMrK5W5qgaGZqQ")

headers = {
    "Content-Type" : "application/x-www-form-urlencoded",
    "Authorization": "Basic " + str(password_str.decode("ascii"))
}

data = urllib.parse.urlencode(values)
data = data.encode("utf-8")

req = urllib.request.Request(url, data, headers)

response = urllib.request.urlopen(req)

response_json = json.loads(response.read().decode("utf-8"))
token = response_json["access_token"]

print("Set-Cookie: oat='" + token + "'\n")
print("Location: wall\n")