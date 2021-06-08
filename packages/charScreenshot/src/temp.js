import https from "https";
import fs from "fs";
import path from "path";

const WebSocketServer = WebSocket.Server;

// const {data} = await axios.get('https://informer.investforum.ru/wss/quotation/getsettings?tch=true')
// try {
//     const settings = JSON.parse(data);
//     const mappedSettings = settings.reduce((acc, item) => {
//         return {
//             ...acc,
//             [item.ID]: item
//         }
//     }, {})
//     fs.writeFileSync(path.resolve(process.cwd(), 'settings.json'), JSON.stringify(mappedSettings))
// } catch (e) {
//     console.error(e)
// }

const WSServer = function (a_target, a_origin) {
    this._origin = a_origin;
    this._target = a_target;
    this._server = null;
    this._httpsServer = null;
}

WSServer.prototype = {
    Listen: function (a_port) {
        const self = this;
        this._httpsServer = https.createServer({
            'key': fs.readFileSync(path.resolve(process.cwd(), 'src/ssl/key.pem'), 'utf8'),
            'cert': fs.readFileSync(path.resolve(process.cwd(), 'src/ssl/cert.pem'), 'utf8')
        }, app);

        this._httpsServer.listen(a_port);
        this._server = new WebSocketServer({'server': this._httpsServer});
        this._server.on('connection', function (a_socket) {
            self._OnConnection(a_socket);
        });
        this._server.on('error', function (a_event) {
            self._OnError(a_event);
        });
    },

    _OnConnection: function (a_socket) {
        var self = this;
        a_socket.on('open', function () {
            self._OnOpen(a_socket);
        });
        a_socket.on('message', function (a_message, flags) {
            self._OnMessage(a_socket, a_message, flags)
        });
        a_socket.on('ping', function (a_data, a_flags) {
            self._OnPing(a_socket, a_data, a_flags)
        });
        a_socket.on('pong', function (a_data, a_flags) {
            self._OnPong(a_socket, a_data, a_flags)
        });
        a_socket.on('close', function (a_code, a_message) {
            self._OnClose(a_socket, a_code, a_message)
        });
        a_socket.on('error', function (a_error) {
            self._OnError(a_socket, a_error)
        });
        a_socket.type = "client";

        var host = this._target.substr(this._target.indexOf("://") + 3)
        if (host.indexOf("/") > 0)
            host = host.substr(0, host.indexOf("/"));

        var options =
            {
                'host': host,
                'origin': this._origin,
                'headers': {'user-agent': a_socket.upgradeReq.headers['user-agent']}
            }

        a_socket.targetSocket = new WebSocket(this._target, null, options);
        a_socket.targetSocket.on('open', function () {
            self._OnOpen(a_socket.targetSocket);
        });
        a_socket.targetSocket.on('message', function (a_message, flags) {
            self._OnMessage(a_socket.targetSocket, a_message, flags)
        });
        a_socket.targetSocket.on('ping', function (a_data, a_flags) {
            self._OnPing(a_socket.targetSocket, a_data, a_flags)
        });
        a_socket.targetSocket.on('pong', function (a_data, a_flags) {
            self._OnPong(a_socket.targetSocket, a_data, a_flags)
        });
        a_socket.targetSocket.on('close', function (a_code, a_message) {
            self._OnClose(a_socket.targetSocket, a_code, a_message)
        });
        a_socket.targetSocket.on('error', function (a_error) {
            self._OnError(a_socket.targetSocket, a_error)
        });
        a_socket.targetSocket.type = "server";
        a_socket.targetSocket.targetSocket = a_socket;
    },

    _OnOpen: function (a_socket) {
        if (a_socket._messageQueue != null) {
            for (var i = 0; i < a_socket._messageQueue.length; i++) {
                a_socket.send(a_socket._messageQueue[i].message, a_socket._messageQueue[i].flags);
            }
            a_socket._messageQueue = null;
        }
    },

    _OnMessage: function (a_socket, a_message, a_flags) {
        var flags = {
            masked: undefined,
            binary: undefined,
            compress: undefined
        };
        if (a_flags.masked != null)
            flags.masked = a_flags.masked;

        if (a_flags.binary != null)
            flags.binary = a_flags.binary;

        if (a_flags.compress != null)
            flags.compress = a_flags.compress;

        if (a_socket.targetSocket.readyState == WebSocket.OPEN)
            a_socket.targetSocket.send(a_message, flags);
        else {
            if (a_socket.targetSocket._messageQueue == null)
                a_socket.targetSocket._messageQueue = [];

            a_socket.targetSocket._messageQueue.push({'message': a_message, 'flags': flags});
        }
    },

    _OnPing: function (a_socket, a_data, a_flags) {
        a_socket.targetSocket.ping(a_data);
    },

    _OnPong: function (a_socket, a_data, a_flags) {
        a_socket.targetSocket.pong(a_data);
    },

    _OnClose: function (a_socket, a_code, a_message) {
        a_socket.targetSocket.close();
    },

    _OnError: function (a_socket, a_error) {
        console.log(a_error);
    }
}

let wsProxyServer = new WSServer("wss://light-trading.umarkets.ai/websocket/", "https://light-trading.umarkets.ai");
