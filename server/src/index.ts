import { createServer } from 'http';
import { WebSocketServer } from 'ws';

// Используем require для CommonJS-модуля
const { setupWSConnection } = require('y-websocket/bin/utils');

const server = createServer();

const wss = new WebSocketServer({ server });

wss.on('connection', (conn, req) => {
  setupWSConnection(conn, req);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Yjs server running on ws://localhost:${PORT}`);
});