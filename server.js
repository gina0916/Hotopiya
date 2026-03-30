const WebSocket = require('ws');

const MAX_USERS = 12;
const PORT = process.env.PORT || 3000;

const wss = new WebSocket.Server({ port: PORT });

let clients = [];
let messagesHistory = [];

console.log(`✅ WebSocket 伺服器已啟動：${PORT}`);

wss.on('connection', (ws) => {

  // 🔒 人數限制（即時）
  if (clients.length >= MAX_USERS) {
    ws.send(JSON.stringify({
      system: true,
      full: true,
      text: "聊天室人數已滿，請稍後再試"
    }));
    ws.close();
    return;
  }

  ws.nickname = "";
  clients.push(ws);

  // 📜 傳歷史訊息（最多50筆）
  messagesHistory.slice(-50).forEach(msg => {
    ws.send(JSON.stringify(msg));
  });

  broadcastOnlineUsers();

  ws.on('message', (data) => {
    let msgObj;

    // 🛡 防 JSON 錯誤（很重要）
    try {
      msgObj = JSON.parse(data);
    } catch (err) {
      return;
    }

    // 👤 設定暱稱（只設定一次 + 防重複）
    if (!ws.nickname && msgObj.nickname) {
      let name = msgObj.nickname.trim() || "匿名";

      const exists = clients.some(c => c.nickname === name);
      if (exists) {
        name += "_" + Math.floor(Math.random() * 1000);
      }

      ws.nickname = name;

      // 📢 系統訊息：加入
      broadcast({
        system: true,
        text: `🟢 ${ws.nickname} 加入聊天室`
      });

      broadcastOnlineUsers();
    }

    // 💬 一般訊息
    if (msgObj.text) {
      const messageData = {
        nickname: ws.nickname || "匿名",
        text: msgObj.text
      };

      messagesHistory.push(messageData);

      // 🧹 限制歷史訊息最多100筆
      if (messagesHistory.length > 100) {
        messagesHistory.shift();
      }

      broadcast(messageData);
    }
  });

  ws.on('close', () => {
    clients = clients.filter(c => c !== ws);

    if (ws.nickname) {
      broadcast({
        system: true,
        text: `🔴 ${ws.nickname} 離開聊天室`
      });
    }

    broadcastOnlineUsers();
  });

  ws.on('error', () => {
    // 防止 WebSocket error 讓 server crash
  });
});


// 📡 廣播訊息
function broadcast(msg) {
  clients.forEach(c => {
    if (c.readyState === WebSocket.OPEN) {
      c.send(JSON.stringify(msg));
    }
  });
}


// 👥 廣播在線名單
function broadcastOnlineUsers() {
  const nicknames = clients
    .map(c => c.nickname)
    .filter(Boolean);

  broadcast({
    system: true,
    onlineUsers: nicknames
  });
}