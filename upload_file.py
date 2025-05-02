#--------------------------------------------------------------------
# Set app parameters
ip_address = "192.168.0.1"
username = "admin"
password = "Siemens1234!"
resource = "/UserFiles/notes.txt"
file_path = "./notes.txt"
#--------------------------------------------------------------------

# Imports
import os
from simatic_web_api import WebApiSession

# Initialize API session
api = WebApiSession(ip=ip_address, username=username, password=password)

#Ping
result = api.ping()
print("Ping result: ", result)

if result:

    # Login
    token = api.login()
    print("Token received: ", token)

    if token:

        ticket_id = api.create_file(resource)
        print(f"Ticket ID for {resource}: {ticket_id}")
                
        result = api.upload_file(ticket_id, file_path)
        print(f"Upload result for {resource}: {result}")

        result = api.close_ticket(ticket_id)
        print(f"Ticket ID {ticket_id} delete result: {result}")

        result = api.browse_files("/")
        print("Browse files result:", result)

    # Logout
    api.logout()


