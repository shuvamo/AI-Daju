// ⚠️ Set this to the same backend URL your OLD script.js was using.
const API_BASE = "http://localhost:3000";

const $ = (id) => document.getElementById(id);
const chat = $("chatMessages"), typing = $("typingIndicator"), input = $("userInput"),
      sendBtn = $("sendBtn"), charCount = $("charCount");
const HKEY = "daju_history_v2", SKEY = "daju_session_v2";
const sessionId = localStorage.getItem(SKEY) || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));
localStorage.setItem(SKEY, sessionId);

let history = [];
try { history = JSON.parse(localStorage.getItem(HKEY)) || []; } catch { history = []; }
let busy = false;

function save() { try { localStorage.setItem(HKEY, JSON.stringify(history.slice(-100))); } catch {} }

function addMsg(role, text, animate = true, isError = false) {
  const row = document.createElement("div");
  row.className = `msg ${role}${isError ? " error" : ""}${animate ? " new" : ""}`;
  const b = document.createElement("div");
  b.className = "bubble";
  b.textContent = text;
  row.appendChild(b);
  chat.insertBefore(row, typing);
  chat.scrollTop = chat.scrollHeight;
}

function welcome() {
  addMsg("daju", "Aye bhai! K cha khabar? Bhana, aaja k chal ra cha?", false);
}

function render() {
  history.forEach((m) => addMsg(m.role, m.text, false));
  if (!history.length) welcome();
  chat.scrollTop = chat.scrollHeight;
}

async function send(text) {
  text = text.trim();
  if (!text || busy) return;
  busy = true; sendBtn.disabled = true;
  addMsg("user", text);
  history.push({ role: "user", text }); save();
  input.value = ""; autosize();
  typing.classList.add("show"); chat.scrollTop = chat.scrollHeight;
  try {
    const res = await fetch(`${API_BASE}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, sessionId }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const reply = data.reply || "Hmm, kei bhayena. Feri bhanata?";
    typing.classList.remove("show");
    addMsg("daju", reply);
    history.push({ role: "daju", text: reply }); save();
  } catch (e) {
    typing.classList.remove("show");
    addMsg("daju", "Daju can't connect right now. Check your internet or try again in a moment.", true, true);
  } finally {
    busy = false; sendBtn.disabled = !input.value.trim();
    input.focus();
  }
}

function autosize() {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 140) + "px";
  charCount.textContent = `${input.value.length}/500`;
  sendBtn.disabled = busy || !input.value.trim();
}

async function health() {
  const dot = $("statusDot"), txt = $("statusText");
  try {
    const r = await fetch(`${API_BASE}/health`);
    if (!r.ok) throw 0;
    dot.className = "status-dot online"; txt.textContent = "Online";
  } catch { dot.className = "status-dot offline"; txt.textContent = "Offline"; }
}

input.addEventListener("input", autosize);
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input.value); }
});
sendBtn.addEventListener("click", () => send(input.value));
document.querySelectorAll(".suggestion-chip").forEach((c) =>
  c.addEventListener("click", () => send(c.dataset.msg)));

$("clearBtn").addEventListener("click", async () => {
  history = []; save();
  chat.querySelectorAll(".msg:not(#typingIndicator)").forEach((n) => n.remove());
  welcome();
  try {
    await fetch(`${API_BASE}/chat/history`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
  } catch {}
});

render(); autosize(); health(); setInterval(health, 30000);
