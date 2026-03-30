const WebSocket = require('ws');

const MAX_USERS = 12;
const PORT = process.env.PORT || 3000;

const wss = new WebSocket.Server({ port: PORT });

let clients = [];
let messagesHistory = [];

console.log(`✅ WebSocket 伺服器已啟動：${PORT}`);

wss.on('connection', (ws) => {

  // 人數限制
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

  // 傳歷史訊息（最多 50 筆）
  messagesHistory.slice(-50).forEach(msg => ws.send(JSON.stringify(msg)));

  broadcastOnlineUsers();

  ws.on('message', (data) => {
    let msgObj;
    try { msgObj = JSON.parse(data); } catch { return; }

    // 設定暱稱
    if (!ws.nickname && msgObj.nickname) {
      let name = msgObj.nickname.trim() || "匿名";

      // 避免重複
      if (clients.some(c => c.nickname === name)) {
        name += "_" + Math.floor(Math.random() * 1000);
      }

      ws.nickname = name;

      // 系統訊息
      broadcast({
        system: true,
        text: `🟢 ${ws.nickname} 加入聊天室`
      });

      broadcastOnlineUsers();
    }

    // 一般訊息
    if (msgObj.text) {
      const messageData = {
        nickname: ws.nickname || "匿名",
        text: msgObj.text
      };
      messagesHistory.push(messageData);
      if (messagesHistory.length > 100) messagesHistory.shift();

      broadcast(messageData);
    }
  });

  ws.on('close', () => {
    clients = clients.filter(c => c !== ws);
    if (ws.nickname) {
      broadcast({ system: true, text: `🔴 ${ws.nickname} 離開聊天室` });
    }
    broadcastOnlineUsers();
  });

  ws.on('error', () => { /* 防止 crash */ });
});

// 廣播訊息給所有人
function broadcast(msg) {
  clients.forEach(c => {
    if (c.readyState === WebSocket.OPEN) {
      c.send(JSON.stringify(msg));
    }
  });
}

// 廣播在線名單
function broadcastOnlineUsers() {
  const nicknames = clients.map(c => c.nickname).filter(Boolean);
  broadcast({ system: true, onlineUsers: nicknames });
}
