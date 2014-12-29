import cgi

form = cgi.FieldStorage()

print "Content-Type: text/plain\n"
print form["code"]