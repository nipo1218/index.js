const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log("Server running on " + port);
});

// Render用 WebSocketサーバー (Node.js)
const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// クライアント管理
const clients = new Map();
const socketToId = new Map();

// ヘルスチェック用エンドポイント
app.get('/', (req, res) => {
  res.send('WebSocket Server - OK');
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', clients: clients.size });
});

wss.on('connection', (socket) => {
  const id = crypto.randomUUID();
  clients.set(id, socket);
  socketToId.set(socket, id);
  console.log(`Connected: ${id} (Total: ${clients.size})`);

  socket.on('message', (message) => {
    const senderId = socketToId.get(socket);
    if (!senderId) return;

    try {
      const data = JSON.parse(message.toString());
      data.id = senderId;
      const msg = JSON.stringify(data);

      // 自分以外の全員に転送
      for (const [id, client] of clients) {
        if (id !== senderId && client.readyState === 1) { // WebSocket.OPEN = 1
          client.send(msg);
        }
      }
    } catch (err) {
      console.error('Message error:', err);
    }
  });

  socket.on('close', () => {
    const id = socketToId.get(socket);
    if (id) {
      clients.delete(id);
      socketToId.delete(socket);
      console.log(`Disconnected: ${id} (Total: ${clients.size})`);

      // 切断通知を全員に送信
      const leaveMsg = JSON.stringify({ type: 'leave', id: id });
      for (const [otherId, otherClient] of clients) {
        if (otherClient.readyState === 1) {
          otherClient.send(leaveMsg);
        }
      }
    }
  });

  socket.on('error', (err) => {
    console.error('WebSocket error:', err);
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});