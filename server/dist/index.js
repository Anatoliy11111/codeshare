"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const ws_1 = require("ws");
// Используем require для CommonJS-модуля
const { setupWSConnection } = require('y-websocket/bin/utils');
const server = (0, http_1.createServer)();
const wss = new ws_1.WebSocketServer({ server });
wss.on('connection', (conn, req) => {
    // @ts-ignore — y-websocket 1.x не имеет полной типизации
    setupWSConnection(conn, req);
});
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Yjs server running on ws://localhost:${PORT}`);
});
