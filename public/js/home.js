const socket = io();
const createChatButton = document.getElementById("createChat");
const chatLinkDiv = document.getElementById("chatLink");
const chatLinkInput = document.getElementById("chatLinkInput");
const copyLinkButton = document.getElementById("copyLink");

createChatButton.addEventListener("click", () => {
    const roomId = Math.random().toString(36).substring(2, 8);
    socket.emit("create-room", roomId);

    socket.on("room-created", ({ roomId }) => {
        const chatLink = `${window.location.origin}/chat/${roomId}`;
        chatLinkInput.value = chatLink;
        chatLinkDiv.classList.remove("d-none");
    });
});

copyLinkButton.addEventListener("click", () => {
    chatLinkInput.select();
    navigator.clipboard.writeText(chatLinkInput.value).then(() => {
        alert("Chat link copied to clipboard!");
    }).catch(() => {
        alert("Failed to copy link.");
    });
});
