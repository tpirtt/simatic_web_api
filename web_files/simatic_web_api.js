class WebApiSession {
    constructor(ip, username, password) {
        this.ip = ip;
        this.username = username;
        this.password = password;
        this._id = 0;
        this._token = null;
        this._url = `https://${this.ip}/api/jsonrpc`;
    }

    static async _printResponse(body, response) {
        let jsonResponse;
        let responseCode = response.status;

        try {
            jsonResponse = await response.json();
        } catch (e) {
            jsonResponse = await response.text();
        }

        const responseData = {
            body,
            response_code: responseCode,
            json_response: jsonResponse
        };
        console.log(JSON.stringify(responseData, null, 4));
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
                headers: headers,
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                throw new Error(`Login failed: ${response.status}`);
            }

            await WebApiSession._printResponse(body, response);

            const json = await response.json();
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
                headers: headers,
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                throw new Error(`Logout failed: ${response.status}`);
            }

            await WebApiSession._printResponse(body, response);
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
                headers: headers,
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                throw new Error(`Ping failed: ${response.status}`);
            }

            await WebApiSession._printResponse(body, response);

            const json = await response.json();
            return json?.result || {};
        } catch (error) {
            console.error(`Error in ping request: ${error}`);
            return null;
        }
    }
}
