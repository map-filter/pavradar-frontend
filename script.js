let socket;
let jwtToken = localStorage.getItem("jwtToken") || "";

const HTTP_API = "https://pavradar-backend.fly.dev";
const WS_API = "wss://pavradar-backend.fly.dev";

window.onload = () => {
  if (jwtToken) {
    document.getElementById("auth").style.display = "none";
    document.getElementById("chatContainer").style.display = "block";
    connectSocket(jwtToken);
    loadHistory(jwtToken);
    document.getElementById("message").focus();
  }

  // Enter to send message
  document.getElementById("message").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  });

  document.getElementById("message").addEventListener("focus", () => {
    document.getElementById("message").scrollIntoView({ block: "nearest" });
  });  
};

function toggleForm(form) {
  document.getElementById("loginForm").style.display = form === "login" ? "block" : "none";
  document.getElementById("registerForm").style.display = form === "register" ? "block" : "none";
}

async function register() {
  const username = document.getElementById("register-username").value;
  const email = document.getElementById("register-email").value;
  const password = document.getElementById("register-password").value;
  const res = await fetch(`${HTTP_API}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password })
  });
  if (res.ok) {
    alert("Registered successfully. Now login.");
    toggleForm("login");
  } else {
    alert("Registration failed");
  }
}

async function login() {
  const username = document.getElementById("login-username").value;
  const password = document.getElementById("login-password").value;
  const res = await fetch(`${HTTP_API}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
  });
  const data = await res.json();
  if (data.access_token) {
    jwtToken = data.access_token;
    localStorage.setItem("jwtToken", jwtToken);
    document.getElementById("auth").style.display = "none";
    document.getElementById("chatContainer").style.display = "block";
    connectSocket(jwtToken);
    loadHistory(jwtToken);
    document.getElementById("message").focus();
  } else {
    alert("Login failed");
  }
}

function logout() {
  jwtToken = "";
  localStorage.removeItem("jwtToken");
  document.getElementById("auth").style.display = "block";
  document.getElementById("chatContainer").style.display = "none";
  if (socket) socket.close();
}

function connectSocket(token) {
  socket = new WebSocket(`${WS_API}/ws/chat?token=${token}`);

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
}

async function loadHistory(token) {
  const res = await fetch(`${HTTP_API}/messages`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  data.forEach(msg => {
    const date = new Date(msg.timestamp);
    const formatted = date.toLocaleString("en-GB").replace(",", "");
    logMessage(`🕓 ${formatted} — User ${msg.author_id}: ${msg.content}`);
  });
}

function sendMessage() {
  const input = document.getElementById("message");
  if (socket && socket.readyState === WebSocket.OPEN) {
    if (input.value.trim()) {
      socket.send(input.value);
      input.value = "";
    }
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
    list.innerHTML += `👤 User ${id}<br>`;
  });
}

function connectSocket(token) {
  socket = new WebSocket(`${WS_API}/ws/chat?token=${token}`);

  socket.onopen = () => {
    logMessage("✅ Connected to chat");
    // пинг
    socket.pingInterval = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send("ping");
      }
    }, 15000);
  };

  socket.onclose = () => {
    logMessage("❌ Disconnected");
    clearInterval(socket.pingInterval);
    setTimeout(() => {
      connectSocket(token); // повторное подключение
    }, 3000);
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === "online") updateOnlineList(data.users);
      else logMessage(data);
    } catch {
      logMessage(event.data);
    }
  };
}
