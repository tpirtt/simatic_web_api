import requests
import urllib3
from datetime import datetime
import re
import mimetypes
import json
import os
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


class WebApiSession:
    def __init__(self, ip, username, password):
        self.ip = ip
        self.username = username
        self.password = password
        self._id = 0
        self._token = None
        self._url = f'https://{self.ip}/api/jsonrpc'

    @staticmethod
    def _print_response(body, response_code, response):
        if isinstance(response, requests.Response):
            try:
                json_response = response.json()
            except requests.exceptions.JSONDecodeError:
                json_response = response.text
        else:
            json_response = response  # If already a dictionary

        response_data = {
            "body": body,
            "response_code": response_code,
            "json_response": json_response
        }
        print(json.dumps(response_data, indent=4))

    def set_token(self, token):
        self._token = token

    # Login
    def login(self):
        self._id += 1
        headers = {"Content-Type": "application/json"}
        body = {
            "id": self._id,
            "jsonrpc": "2.0",
            "method": "Api.Login",
            "params": {
                "user": self.username,
                "password": self.password
            }
        }
        try:
            response = requests.post(self._url, json=body, headers=headers, verify=False)
            response.raise_for_status()
            json_response = response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error in login request: {e}")
            return None

        self._print_response(body, response.status_code, response)

        self._token = json_response.get("result", {}).get("token")
        return self._token


    # Logout
    def logout(self):
        self._id += 1
        headers = {"Content-Type": "application/json", "X-Auth-Token": self._token}
        body = {
            "id": self._id,
            "jsonrpc": "2.0",
            "method": "Api.Logout"
        }
        try:
            response = requests.post(self._url, json=body, headers=headers, verify=False)
            response.raise_for_status()
            json_response = response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error in logout request: {e}")
            return None

        self._print_response(body, response.status_code, response)
        self._token = None
        return True

    # Browse tickets
    def browse_tickets(self):
        self._id += 1
        headers = {"Content-Type": "application/json", "X-Auth-Token": self._token}
        body = {
            "id": self._id,
            "jsonrpc": "2.0",
            "method": "Api.BrowseTickets"
        }

        try:
            response = requests.post(self._url, json=body, headers=headers, verify=False)
            response.raise_for_status()
            json_response = response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error in browse tickets request: {e}")
            return None

        self._print_response(body, response.status_code, response)
        return json_response.get("result", {}).get("tickets")

    # Close a ticket
    def close_ticket(self, ticket_id):
        self._id += 1
        headers = {"Content-Type": "application/json", "X-Auth-Token": self._token}
        body = {
            "id": self._id,
            "jsonrpc": "2.0",
            "method": "Api.CloseTicket",
            "params": {"id": ticket_id}
        }

        try:
            response = requests.post(self._url, json=body, headers=headers, verify=False)
            response.raise_for_status()
            json_response = response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error in close ticket request: {e}")
            return None

        self._print_response(body, response.status_code, response)
        return json_response.get("result")

    # Upload a file
    def upload_file(self, ticket_id, filename):
        url = f'https://{self.ip}/api/ticket?id={ticket_id}'
        headers = {"Content-Type": "application/octet-stream"}
        try:
            if not os.path.exists(filename):
                print(f"Error: File '{filename}' does not exist.")
                return None
            with open(filename, "rb") as file:
                file_contents = file.read()
                print(f"File size: {len(file_contents)} bytes")
            response = requests.post(url, data=file_contents, headers=headers, verify=False)
            response.raise_for_status()
        except (requests.exceptions.RequestException, IOError) as e:
            print(f"Error in upload file request: {e}")
            return None

        self._print_response("N/A", response.status_code, response)

    # Download a file
    def download_file(self, ticket_id):
        url = f'https://{self.ip}/api/ticket?id={ticket_id}'
        headers = {"Content-Type": "application/octet-stream"}
        try:
            response = requests.get(url, verify=False)
            response.raise_for_status()
            filename = re.findall("filename=(.+)", response.headers.get("content-Disposition", ""))[0].strip('"')
            with open(filename, "wb") as file:
                file.write(response.content)
        except (requests.exceptions.RequestException, IndexError, IOError) as e:
            print(f"Error in download file request: {e}")
            return None

        self._print_response("N/A", response.status_code, response)

    # Web application create
    def web_app_create(self, name):
        self._id += 1
        headers = {"Content-Type": "application/json", "X-Auth-Token": self._token}
        body = {
            "id": self._id,
            "jsonrpc": "2.0",
            "method": "WebApp.Create",
            "params": {"name": name}
        }

        try:
            response = requests.post(self._url, json=body, headers=headers, verify=False)
            response.raise_for_status()
            json_response = response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error in web app create request: {e}")
            return None

        self._print_response(body, response.status_code, response)
        return json_response.get("result")

    # Web application delete
    def web_app_delete(self, name):
        self._id += 1
        headers = {"Content-Type": "application/json", "X-Auth-Token": self._token}
        body = {
            "id": self._id,
            "jsonrpc": "2.0",
            "method": "WebApp.Delete",
            "params": {"name": name}
        }

        try:
            response = requests.post(self._url, json=body, headers=headers, verify=False)
            response.raise_for_status()
            json_response = response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error in web app delete request: {e}")
            return None

        self._print_response(body, response.status_code, response)
        return json_response.get("result")

    # Web application browse
    def web_app_browse(self):
        self._id += 1
        headers = {"Content-Type": "application/json", "X-Auth-Token": self._token}
        body = {
            "id": self._id,
            "jsonrpc": "2.0",
            "method": "WebApp.Browse"
        }

        try:
            response = requests.post(self._url, json=body, headers=headers, verify=False)
            response.raise_for_status()
            json_response = response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error in web app browse request: {e}")
            return None

        self._print_response(body, response.status_code, response)
        return json_response.get("result")

    # Web application set default page
    def web_app_set_default_page(self, name, resource_name):
        self._id += 1
        headers = {"Content-Type": "application/json", "X-Auth-Token": self._token}
        body = {
            "id": self._id,
            "jsonrpc": "2.0",
            "method": "WebApp.SetDefaultPage",
            "params": {"name": name, "resource_name": resource_name}
        }

        try:
            response = requests.post(self._url, json=body, headers=headers, verify=False)
            response.raise_for_status()
            json_response = response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error in web app set default page request: {e}")
            return None

        self._print_response(body, response.status_code, response)
        return json_response.get("result")

    # Get media type
    @staticmethod
    def _get_media_type(filename):
        media_type, _ = mimetypes.guess_type(filename)
        return media_type if media_type else "application/octet-stream"

    # Web application create resource
    def web_app_create_resource(self, app_name, name):
        self._id += 1
        headers = {"Content-Type": "application/json", "X-Auth-Token": self._token}

        time = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
        media_type = self._get_media_type(name)

        body = {
            "id": self._id,
            "jsonrpc": "2.0",
            "method": "WebApp.CreateResource",
            "params": {
                "app_name": app_name,
                "name": name,
                "media_type": media_type,
                "last_modified": time
            }
        }

        try:
            response = requests.post(self._url, json=body, headers=headers, verify=False)
            response.raise_for_status()
            json_response = response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error in web app create resource request: {e}")
            return None

        self._print_response(body, response.status_code, response)
        return json_response.get("result")
    
    # Web application browse resource
    def web_app_browse_resource(self, app_name):
        self._id += 1
        headers = {"Content-Type": "application/json", "X-Auth-Token": self._token}
        body = {
            "id": self._id,
            "jsonrpc": "2.0",
            "method": "WebApp.BrowseResources",
            "params": {
                "app_name": app_name
            }
        }

        try:
            response = requests.post(self._url, json=body, headers=headers, verify=False)
            response.raise_for_status()
            json_response = response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error in web app browse resource request: {e}")
            return None

        self._print_response(body, response.status_code, response)
        return json_response.get("result")
