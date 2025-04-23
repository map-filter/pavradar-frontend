let socket;
let jwtToken = "";

const HTTP_API = "https://pavradar-backend.fly.dev";
const WS_API = "wss://pavradar-backend.fly.dev";

async function loadHistory(token) {
  const res = await fetch(`${HTTP_API}/messages`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  const data = await res.json();
  data.forEach(msg => {
    const deleteBtn = `<button onclick="deleteMessage(${msg.id})">🗑</button>`;
    logMessage(`🕓 ${msg.timestamp} — User ${msg.author_id}: ${msg.content} ${deleteBtn}`);
  });
}

document.getElementById("token").addEventListener("change", () => {
  jwtToken = document.getElementById("token").value;
  socket = new WebSocket(`${WS_API}/ws/chat?token=${jwtToken}`);

  loadHistory(jwtToken);

  socket.onopen = () => logMessage("✅ Connected to chat");
  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === "online") updateOnlineList(data.users);
      else logMessage(data);
    } catch {
      logMessage(event.data);
    }
  };
  socket.onclose = () => logMessage("❌ Disconnected");
});

function sendMessage() {
  const input = document.getElementById("message");
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(input.value);
    input.value = "";
  } else {
    logMessage("⚠️ WebSocket not connected");
  }
}

function logMessage(msg) {
  const chat = document.getElementById("chat");
  chat.innerHTML += `<div>${msg}</div>`;
  chat.scrollTop = chat.scrollHeight;
}

function updateOnlineList(users) {
  const list = document.getElementById("online-users");
  list.innerHTML = `<strong>👥 Online:</strong><br>`;

  users.forEach(id => {
    list.innerHTML += `
      👤 User ${id}
      <button onclick="kickUser(${id})">Kick</button>
      <button onclick="banUser(${id}, 60)">Ban 1h</button>
      <button onclick="banUser(${id}, 1440)">Ban 24h</button>
      <button onclick="banUser(${id}, null)">Ban ∞</button>
      <button onclick="unbanUser(${id})">Unban</button>
      <br>`;
  });

  list.innerHTML += `<br><button onclick="clearChat()">🧹 Clear Chat</button>`;
}

async function deleteMessage(id) {
  const confirmed = confirm("Delete this message?");
  if (!confirmed) return;
  await fetch(`${HTTP_API}/messages/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${jwtToken}` }
  });
  location.reload();
}

async function clearChat() {
  const confirmed = confirm("Clear the entire chat?");
  if (!confirmed) return;
  await fetch(`${HTTP_API}/messages`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${jwtToken}` }
  });
  location.reload();
}

async function kickUser(id) {
  const res = await fetch(`${HTTP_API}/kick`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwtToken}`
    },
    body: JSON.stringify({ user_id: id })
  });
  const result = await res.json();
  alert(result.detail);
}

async function banUser(id, duration) {
  const res = await fetch(`${HTTP_API}/ban`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwtToken}`
    },
    body: JSON.stringify({ user_id: id, duration: duration })
  });
  const result = await res.json();
  alert(result.detail);
}

async function unbanUser(id) {
  const res = await fetch(`${HTTP_API}/unban`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwtToken}`
    },
    body: JSON.stringify({ user_id: id })
  });
  const result = await res.json();
  alert(result.detail);
}
