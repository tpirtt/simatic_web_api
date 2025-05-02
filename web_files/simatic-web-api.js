class WebApiSession {
    constructor(ip, username, password) {
        this.ip = ip;
        this.username = username;
        this.password = password;
        this._id = 0;
        this._token = null;
        this._url = `https://${this.ip}/api/jsonrpc`;
    }

    setToken(token) {
        this._token = token;
    }

    async login() {
        this._id += 1;
        const headers = { "Content-Type": "application/json" };
        const body = {
            id: this._id,
            jsonrpc: "2.0",
            method: "Api.Login",
            params: {
                user: this.username,
                password: this.password
            }
        };

        try {
            const response = await fetch(this._url, {
                method: "POST",
                headers,
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                throw new Error(`Login failed: ${response.status}`);
            }

            const json = await response.json();
            console.log("Login response:", JSON.stringify(json, null, 4));

            this._token = json?.result?.token || null;
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

            if (!response.ok) {
                throw new Error(`Logout failed: ${response.status}`);
            }

            const json = await response.json();
            console.log("Logout response:", JSON.stringify(json, null, 4));

            this._token = null;
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
                resource : resource
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
}
