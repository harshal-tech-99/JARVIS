const sendBtn = document.getElementById("send-btn");
const userInput = document.getElementById("user-input");
const chatBox = document.getElementById("chat-box");

// NEW: upload elements & state
const uploadBtn = document.getElementById("upload-btn");
const fileInputEl = document.getElementById("file-input");
let pendingImage = null; // { base64, mime, name, url }

// --- Loader control ---
window.addEventListener("load", () => {
  const loader = document.getElementById("loading-screen");
  const app = document.getElementById("chat-container");
  const textEl = document.getElementById("loading-text");

  const lines = [
    
    "JARVIS is ready…"
  ];
  const showForMs = 900;

  let i = 0;
  function typeLine(str, done) {
    textEl.textContent = "";
    let idx = 0;
    const t = setInterval(() => {
      textEl.textContent += str.charAt(idx++);
      if (idx >= str.length) { clearInterval(t); done && done(); }
    }, 25);
  }
  function cycleLines() {
    typeLine(lines[i], () => {
      i = (i + 1) % lines.length;
      setTimeout(cycleLines, 500);
    });
  }
  cycleLines();

  setTimeout(() => {
    loader.style.display = "none";
    app.style.display = "flex";
    app.classList.add("fade-in");
  }, showForMs);
});

// Use your own restricted key in production.
const API_KEY = "AIzaSyA7MRikbw5QVfEMi18oqhzIvKCp0H8hfHo";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

// Events
sendBtn.addEventListener("click", sendMessage);
userInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

// NEW: upload interactions
uploadBtn.addEventListener("click", () => fileInputEl.click());
fileInputEl.addEventListener("change", onFileChosen);

function showTyping(on) {
  const t = document.getElementById("typing");
  t.classList.toggle("hidden", !on);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function addUserBubble(html) {
  const userMsgDiv = document.createElement("div");
  userMsgDiv.classList.add("message", "user-message");
  userMsgDiv.innerHTML = html;
  chatBox.appendChild(userMsgDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function addBotBubble(html) {
  const botMsgDiv = document.createElement("div");
  botMsgDiv.classList.add("message", "bot-message");
  botMsgDiv.innerHTML = html;
  chatBox.appendChild(botMsgDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}

async function onFileChosen(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    addBotBubble("<span>Error: Please select an image file.</span>");
    fileInputEl.value = "";
    return;
  }

  const MAX_IMAGE_MB = 7; // keep payloads reasonable for client-side calls
  if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
    addBotBubble(`<span>Error: Image is larger than ${MAX_IMAGE_MB} MB.</span>`);
    fileInputEl.value = "";
    return;
  }

  try {
    // Convert to Base64 (strip data: prefix) and keep a local preview URL
    const { base64, mime } = await fileToBase64(file);
    const url = URL.createObjectURL(file);
    pendingImage = { base64, mime, name: file.name, url };

    // Show what the user selected (small preview)
    addUserBubble(`
      <span>Uploaded image: ${escapeHtml(file.name)}</span>
      <img src="${url}" alt="uploaded image" class="chat-image" />
    `);

    // Auto-send with a default instruction (no manual prompt needed)
    userInput.value = "Describe this image briefly.";
    sendMessage();

  } catch (err) {
    console.error(err);
    addBotBubble("<span>Error reading the image file.</span>");
    fileInputEl.value = "";
    pendingImage = null;
  }
}

function sendMessage() {
  const message = userInput.value.trim();
  if (!message && !pendingImage) return; // nothing to send

  showTyping(true);

  // Add user's text bubble only if user typed something new
  if (message && !pendingImage) {
    addUserBubble(`<span>${escapeHtml(message)}</span>`);
  }

  userInput.value = "";
  generateBotResponse(message);
}

async function generateBotResponse(message) 
{
  // Build parts: text + (optional) image
  const parts = [];
  if (message) {
    parts.push({ text: `Answer in 2-3 sentences. ${message}` });
  }
  if (pendingImage) {
    parts.push({
      inlineData: {
        mimeType: pendingImage.mime,
        data: pendingImage.base64
      }
    });
  }

  const body = {
    contents: [
      {
        role: "user",
        parts
      }
    ]
  };

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "API request failed");

    const botText =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "I couldn’t generate a response.";

    addBotBubble(`<span>${escapeHtml(botText)}</span>`);

  } catch (error) {
    console.error(error);
    addBotBubble(`<span>Error: ${escapeHtml(error.message)}</span>`);
  } finally {
    // reset image state after one request
    if (pendingImage?.url) URL.revokeObjectURL(pendingImage.url);
    pendingImage = null;
    fileInputEl.value = "";
    showTyping(false);
  }
}

// --- Helpers ---
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const dataUrl = reader.result; // "data:image/png;base64,AAAA..."
      const base64 = String(dataUrl).split(",")[1]; // strip the prefix
      resolve({ base64, mime: file.type });
    };
    reader.readAsDataURL(file);
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// DOM elements for buttons

const aboutBtn = document.getElementById("about-btn");

const botInfoModal = document.getElementById("botInfoModal");
const closeModalBtn = document.querySelector(".close");

// Event listeners for the new buttons

aboutBtn.addEventListener("click", showAboutPage);
closeModalBtn.addEventListener("click", closeAboutModal);


// Show the About page (modal with information)
function showAboutPage() {
    botInfoModal.style.display = "block";
}

// Close the About modal
function closeAboutModal() {
    botInfoModal.style.display = "none";
}

// Hide home page when About or Help is clicked
function hideHomePage() {
    const app = document.getElementById("chat-container");
    app.style.display = "none";
}
