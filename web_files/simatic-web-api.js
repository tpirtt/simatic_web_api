class WebApiSession {
    constructor(ip, token = null) {
        this.ip = ip;
        this._id = 0;
        this._token = token;
        this._url = `https://${this.ip}/api/jsonrpc`;
    }

    setToken(token) {
        this._token = token;
        this.saveToken();
    }

    saveToken() {
        if (this._token) {
            localStorage.setItem(`webApiToken-${this.ip}`, this._token);
        }
    }

    loadToken() {
        const token = localStorage.getItem(`webApiToken-${this.ip}`);
        if (token) {
            this._token = token;
            return true;
        }
        return false;
    }

    clearToken() {
        localStorage.removeItem(`webApiToken-${this.ip}`);
        this._token = null;
    }

    async login(username, password) {
        this._id += 1;
        const headers = { "Content-Type": "application/json" };
        const body = {
            id: this._id,
            jsonrpc: "2.0",
            method: "Api.Login",
            params: { user: username, password }
        };

        try {
            const response = await fetch(this._url, {
                method: "POST",
                headers,
                body: JSON.stringify(body)
            });

            if (!response.ok) throw new Error(`Login failed: ${response.status}`);

            const json = await response.json();
            console.log("Login response:", JSON.stringify(json, null, 4));

            this.setToken(json?.result?.token || null);
            return this._token;
        } catch (error) {
            console.error(`Error in login request: ${error}`);
            return null;
        }
    }

    async logout() {
        this._id += 1;
        const headers = {
            "Content-Type": "application/json",
            "X-Auth-Token": this._token
        };
        const body = {
            id: this._id,
            jsonrpc: "2.0",
            method: "Api.Logout"
        };

        try {
            const response = await fetch(this._url, {
                method: "POST",
                headers,
                body: JSON.stringify(body)
            });

            if (!response.ok) throw new Error(`Logout failed: ${response.status}`);

            const json = await response.json();
            console.log("Logout response:", JSON.stringify(json, null, 4));

            this.clearToken();
            return true;
        } catch (error) {
            console.error(`Error in logout request: ${error}`);
            return null;
        }
    }

    async ping() {
        this._id += 1;
        const headers = {
            "Content-Type": "application/json",
            "X-Auth-Token": this._token
        };
        const body = {
            id: this._id,
            jsonrpc: "2.0",
            method: "Api.Ping"
        };

        try {
            const response = await fetch(this._url, {
                method: "POST",
                headers,
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                throw new Error(`Ping failed: ${response.status}`);
            }

            const json = await response.json();
            console.log("Ping response:", JSON.stringify(json, null, 4));

            return json?.result || {};
        } catch (error) {
            console.error(`Error in ping request: ${error}`);
            return null;
        }
    }

    async filesBrowse(resource) {
        this._id += 1;
        const headers = {
            "Content-Type": "application/json",
            "X-Auth-Token": this._token
        };
        const body = {
            id: this._id,
            jsonrpc: "2.0",
            method: "Files.Browse",
            params: {
                resource: resource
            }
        };

        try {
            const response = await fetch(this._url, {
                method: "POST",
                headers,
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                throw new Error(`Browse files failed: ${response.status}`);
            }

            const json = await response.json();
            console.log("Browse files response:", JSON.stringify(json, null, 4));

            return json?.result || {};
        } catch (error) {
            console.error(`Error in browse files request: ${error}`);
            return null;
        }
    }

    async filesDownload(resource) {
        this._id += 1;
        const headers = {
            "Content-Type": "application/json",
            "X-Auth-Token": this._token
        };
        const body = {
            id: this._id,
            jsonrpc: "2.0",
            method: "Files.Download",
            params: {
                resource: resource
            }
        };

        try {
            const response = await fetch(this._url, {
                method: "POST",
                headers,
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                throw new Error(`Download files failed: ${response.status}`);
            }

            const json = await response.json();
            console.log("Browse files response:", JSON.stringify(json, null, 4));

            return json?.result || {};
        } catch (error) {
            console.error(`Error in download files request: ${error}`);
            return null;
        }
    }

    async downloadFile(ticketId) {
        const url = `https://${this.ip}/api/ticket?id=${ticketId}`;
        console.log(`Starting download from: ${url}`);

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/octet-stream'
                }
            });

            console.log(`HTTP status: ${response.status}`);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

            const arrayBuffer = await response.arrayBuffer();
            console.log(`Downloaded ${arrayBuffer.byteLength} bytes`);

            const contentDisposition = response.headers.get("content-disposition");
            console.log(`Content-Disposition header: ${contentDisposition}`);

            let filename = "downloaded_file.bin";
            const match = contentDisposition && contentDisposition.match(/filename="?(.+?)"?$/i);
            if (match) {
                filename = match[1];
                console.log(`Extracted filename: ${filename}`);
            }

            return { arrayBuffer, filename };
        } catch (error) {
            console.error(`Error in downloadFile:`, error);
            return null;
        }
    }

    async closeTicket(ticketId) {
        this._id += 1;
        const headers = {
            "Content-Type": "application/json",
            "X-Auth-Token": this._token
        };
        const body = {
            id: this._id,
            jsonrpc: "2.0",
            method: "Api.CloseTicket",
            params: {
                id: ticketId
            }
        };

        try {
            const response = await fetch(this._url, {
                method: "POST",
                headers,
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                throw new Error(`Close ticket failed: ${response.status}`);
            }

            const json = await response.json();
            console.log("Close ticket response:", JSON.stringify(json, null, 4));

            return json?.result || {};
        } catch (error) {
            console.error(`Error in close ticket request: ${error}`);
            return null;
        }
    }

}
