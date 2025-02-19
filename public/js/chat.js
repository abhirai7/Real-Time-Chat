const socket = io();
const roomId = window.location.pathname.split("/").pop();
const messagesContainer = document.getElementById("messages");
const avatars = document.getElementById("avatars");
const usernameInput = document.getElementById("username");
const messageInput = document.getElementById("message");
const sendButton = document.getElementById("send");
const timerElement = document.getElementById("timer");

socket.emit("join-room", roomId);

socket.on("load-messages", ({ messages, expiresAt }) => {

  messages.forEach(({ avatar, username, message, timestamp }) => {
    addMessage(avatar, username, message, timestamp);
  });

  const endTime = new Date(expiresAt);
  updateTimer(endTime);
  setInterval(() => updateTimer(endTime), 1000);
});

socket.on("room-expired", () => {
  alert("This chat room has expired.");
  window.location.href = "/";
});

socket.on("message", ({avatar, username, message, timestamp }) => {
  addMessage(avatar, username, message, timestamp);
});

sendButton.addEventListener("click", sendMessage);

messageInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") sendMessage();
});

function sendMessage() {
  const avatar = avatars.value;
  const username = usernameInput.value.trim();
  const message = messageInput.value.trim();
  if (username && message) {
    socket.emit("message", { roomId, avatar, username, message });
    messageInput.value = "";
  } else {
    alert("Username and message cannot be empty.");
  }
}

function addMessage(avatar, username, message, timestamp) {
  const li = document.createElement("li");
  li.innerHTML = `<span>${avatar} </span><strong class="text-primary">${username}:</strong> ${message} <span class="text-muted" style="font-size: 0.8em;">(${timestamp})</span>`;
  messagesContainer.appendChild(li);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function updateTimer(endTime) {
  const now = new Date();
  const diff = Math.max(0, endTime - now);
  const minutes = String(Math.floor(diff / 60000)).padStart(2, "0");
  const seconds = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");
  timerElement.textContent = `Room expires in: ${minutes}:${seconds}`;

  if (diff <= 0) {
    timerElement.textContent = "Room has expired.";
    socket.emit("room-expired");
  }
}

const userCountElement = document.getElementById("userCount");

socket.on("update-user-count", (count) => {
  userCountElement.textContent = `👨‍👦‍👦: ${count}`;
});

const exportButton = document.getElementById("exportChats");

exportButton.addEventListener("click", () => {
  const chatLog = [];
  document.querySelectorAll("#messages li").forEach((li) => {
    const avatar = li.querySelector("p")?.innerText || "";
    const username =
      li.querySelector(".text-primary")?.innerText.replace(":", "") ||
      "Unknown";
    const message = li.textContent.split(":")[1]?.trim() || "";
    const timestamp =
      li
        .querySelector(".text-muted")
        ?.innerText.replace("(", "")
        .replace(")", "") || "";

    chatLog.push({ avatar, username, message, timestamp });
  });

  if (chatLog.length === 0) {
    alert("No chats to export!");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  if (!chatLog || chatLog.length === 0) {
    console.error("Chat log is empty or undefined.");
    return;
  }

  if (!roomId) {
    console.error("Room ID is undefined.");
    return;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(18);

  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(`Chat Room Export - ${roomId}`, 20, 20);

  const date = new Date().toLocaleDateString();
  doc.setFontSize(12);
  doc.text(`Exported on: ${date}`, 20, 30);

  let y = 40;
  const textWidth = 140;

  chatLog.forEach((log, index) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }

    const message = `${index + 1}. ${log.avatar} ${log.username} [${log.timestamp}]: ${
      log.message.substring(0, log.message.length - 3)
    }`;
    const wrappedText = doc.splitTextToSize(message, textWidth);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(16);
    doc.text(wrappedText, 20, y);

    y += wrappedText.length * 10;
  });

  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(`Page ${i} of ${totalPages}`, 180, 290);
  }

  doc.save(`chat_room_${roomId}_export_${date}.pdf`);
});
