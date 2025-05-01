# ---------------------------------------------------------------
# Read saved token
# try:
#     with open("token.txt", "r") as file:
#         saved_token = file.read().strip()
#         api.set_token(saved_token)
#         print("Using saved token:", saved_token)
# except FileNotFoundError:
#     saved_token = None
# ---------------------------------------------------------------
# token = api.login()
# if token:
#     with open("token.txt", "w") as file:
#         file.write(token)
#     print("Token saved to file!")
# ---------------------------------------------------------------

import os
from simatic_web_api import WebApiSession

# Initialize API session
api = WebApiSession(ip="192.168.0.1", username="admin", password="Siemens1234!")

# Login
token = api.login()
print("Token received: ", token)

# Set app parameters
app_name = "TestApp"
folder_path = "web_files"  # Replace with your folder name
default_page_name = "index.html"

# Delete app that has the same name
result = api.web_app_delete(app_name)
print("Web App Delete result:", result)

# Create new app
result = api.web_app_create(app_name)
print("Web App Create result:", result)

# Create and upload resources
for filename in os.listdir(folder_path):
    file_path = os.path.join(folder_path, filename)

    if os.path.isfile(file_path):  # Ensure it's a file, not a subfolder
        ticket_id = api.web_app_create_resource(app_name, filename)
        print(f"Ticket ID for {filename}: {ticket_id}")
        
        result = api.upload_file(ticket_id, file_path)
        print(f"Upload result for {filename}: {result}")

        result = api.close_ticket(ticket_id)
        print(f"Ticket ID {ticket_id} delete result: {result}")

# Set default page for the application
result = api.web_app_set_default_page(app_name, default_page_name)
print("Set default page result:", result)

# Check results
api.web_app_browse()
api.web_app_browse_resource(app_name)

# Logout
api.logout()
