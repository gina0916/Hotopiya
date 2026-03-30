const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 3000 });

let clients = [];
let onlineUsers = [];
let messages = [];
const maxUsers = 12; // 設定最大人數為 12

wss.on('connection', (ws) => {
  // 如果達到最大人數，拒絕新用戶進入
  if (clients.length >= maxUsers) {
    ws.send(JSON.stringify({ system: true, text: "聊天室人數已滿，請稍後再試。" }));
    ws.close();  // 斷開新用戶連線
    return;
  }

  clients.push(ws);
  ws.send(JSON.stringify({ system: true, text: "歡迎加入聊天室！" }));

  // 新用戶加入時傳送歷史訊息
  messages.forEach(msg => ws.send(JSON.stringify(msg)));

  ws.on('message', (data) => {
    const msgObj = JSON.parse(data);
    
    if (!onlineUsers.includes(msgObj.nickname)) {
      onlineUsers.push(msgObj.nickname);
      broadcastSystem(`${msgObj.nickname} 加入聊天室`);
    }

    messages.push(msgObj);  // 保存歷史訊息
    broadcast(msgObj);
  });

  ws.on('close', () => {
    clients = clients.filter(c => c !== ws);
    onlineUsers = onlineUsers.filter(u => u !== msgObj.nickname);  // 移除離開的使用者
    broadcastSystem(`${msgObj.nickname} 離開聊天室`);
  });

  // 廣播訊息給所有用戶
  function broadcast(msg) {
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(msg));
      }
    });
  }

  // 廣播系統訊息
  function broadcastSystem(text) {
    const sysMsg = { system: true, text, onlineUsers };
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(sysMsg));
      }
    });
  }
});

console.log("WebSocket 伺服器已啟動，監聽 3000 端口");