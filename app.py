import tkinter as tk
from tkinter import filedialog, messagebox, scrolledtext
import os
from simatic_web_api import WebApiSession


class WebAppUploaderGUI:
    def __init__(self, master):
        self.master = master
        master.title("Simatic Web App Uploader")

        # Default values
        self.ip_address = tk.StringVar(value="192.168.0.1")
        self.username = tk.StringVar(value="admin")
        self.password = tk.StringVar(value="Siemens1234!")
        self.app_name = tk.StringVar(value="TestApp")
        self.folder_path = tk.StringVar()
        self.default_page_name = tk.StringVar(value="index.html")

        self.create_widgets()

    def create_widgets(self):
        # Input fields
        tk.Label(self.master, text="IP Address:").grid(row=0, column=0, sticky='e')
        tk.Entry(self.master, textvariable=self.ip_address).grid(row=0, column=1)

        tk.Label(self.master, text="Username:").grid(row=1, column=0, sticky='e')
        tk.Entry(self.master, textvariable=self.username).grid(row=1, column=1)

        tk.Label(self.master, text="Password:").grid(row=2, column=0, sticky='e')
        tk.Entry(self.master, textvariable=self.password, show="*").grid(row=2, column=1)

        tk.Label(self.master, text="App Name:").grid(row=3, column=0, sticky='e')
        tk.Entry(self.master, textvariable=self.app_name).grid(row=3, column=1)

        tk.Label(self.master, text="Default Page:").grid(row=4, column=0, sticky='e')
        tk.Entry(self.master, textvariable=self.default_page_name).grid(row=4, column=1)

        tk.Label(self.master, text="Folder Path:").grid(row=5, column=0, sticky='e')
        tk.Entry(self.master, textvariable=self.folder_path).grid(row=5, column=1)
        tk.Button(self.master, text="Browse", command=self.browse_folder).grid(row=5, column=2)

        tk.Button(self.master, text="Upload App", command=self.upload_app).grid(row=6, column=0, columnspan=3, pady=10)

        # Logging output box
        self.log_output = scrolledtext.ScrolledText(self.master, width=70, height=20, state='disabled')
        self.log_output.grid(row=7, column=0, columnspan=3, padx=10, pady=10)

    def log(self, message):
        self.log_output.config(state='normal')
        self.log_output.insert(tk.END, message + '\n')
        self.log_output.see(tk.END)
        self.log_output.config(state='disabled')
        self.master.update()

    def browse_folder(self):
        folder_selected = filedialog.askdirectory()
        if folder_selected:
            self.folder_path.set(folder_selected)

    def upload_app(self):
        self.log_output.config(state='normal')
        self.log_output.delete(1.0, tk.END)
        self.log_output.config(state='disabled')

        ip = self.ip_address.get()
        user = self.username.get()
        pwd = self.password.get()
        app_name = self.app_name.get()
        folder = self.folder_path.get()
        default_page = self.default_page_name.get()

        try:
            api = WebApiSession(ip=ip, username=user, password=pwd)

            self.log("Pinging device...")
            if not api.ping():
                self.log("Ping failed.")
                messagebox.showerror("Error", "Ping failed.")
                return
            self.log("Ping result: OK")

            self.log("Logging in...")
            token = api.login()
            if not token:
                self.log("Login failed.")
                messagebox.showerror("Error", "Login failed.")
                return
            self.log(f"Token received: {token}")

            self.log(f"Deleting existing app '{app_name}' if it exists...")
            result = api.web_app_delete(app_name)
            self.log(f"Web App Delete result: {result}")

            self.log(f"Creating new app '{app_name}'...")
            result = api.web_app_create(app_name)
            self.log(f"Web App Create result: {result}")

            self.log(f"Uploading files from folder: {folder}")
            for filename in os.listdir(folder):
                file_path = os.path.join(folder, filename)
                if os.path.isfile(file_path):
                    self.log(f"Processing file: {filename}")
                    ticket_id = api.web_app_create_resource(app_name, filename)
                    self.log(f"Ticket ID for {filename}: {ticket_id}")

                    result = api.upload_file(ticket_id, file_path)
                    self.log(f"Upload result for {filename}: {result}")

                    result = api.close_ticket(ticket_id)
                    self.log(f"Ticket ID {ticket_id} close result: {result}")

            self.log(f"Setting default page to: {default_page}")
            result = api.web_app_set_default_page(app_name, default_page)
            self.log(f"Set default page result: {result}")

            self.log("Browsing apps and resources...")
            api.web_app_browse()
            api.web_app_browse_resource(app_name)

            api.logout()
            self.log("Logout complete.")
            messagebox.showinfo("Success", "Web App uploaded successfully!")

        except Exception as e:
            self.log(f"Exception occurred: {e}")
            messagebox.showerror("Error", str(e))


if __name__ == "__main__":
    root = tk.Tk()
    app = WebAppUploaderGUI(root)
    root.mainloop()
