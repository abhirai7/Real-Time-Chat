const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Store room data: { roomId: { messages: [], expiresAt: Date } }
const chatRooms = {};

// Serve static files from the "public" directory
app.use(express.static(path.resolve("./public")));

// Handle the homepage
app.get("/", (req, res) => {
    res.sendFile(path.resolve("./public/index.html"));
});

// Handle dynamic chat room requests
app.get("/chat/:roomId", (req, res) => {
    const roomId = req.params.roomId;

    // Check if the room exists and hasn't expired
    if (chatRooms[roomId] && new Date() < chatRooms[roomId].expiresAt) {
        res.sendFile(path.resolve("./public/chat.html"));
    } else {
        res.status(404).sendFile(path.resolve("./public/404.html"));
    }
});

// Handle Socket.IO connections
io.on("connection", (socket) => {
    console.log("A user connected.");

    // Create a new chat room
    socket.on("create-room", (roomId) => {
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now
        chatRooms[roomId] = { messages: [], expiresAt };

        console.log(`Room created: ${roomId}, expires at ${expiresAt}`);
        socket.emit("room-created", { roomId, expiresAt });

        // Automatically delete the room when it expires
        setTimeout(() => {
            delete chatRooms[roomId];
            console.log(`Room expired: ${roomId}`);
        }, 15 * 60 * 1000); // 15 minutes in milliseconds
    });

    // Join a specific chat room
    socket.on("join-room", (roomId) => {
        const room = chatRooms[roomId];

        // Check if the room exists and hasn't expired
        if (room && new Date() < room.expiresAt) {
            socket.join(roomId);
            console.log(`User joined room: ${roomId}`);

            // Send existing messages and timer to the user
            socket.emit("load-messages", { messages: room.messages, expiresAt: room.expiresAt });
        } else {
            socket.emit("room-expired");
        }
    });

    // Handle sending messages
    socket.on("message", ({ roomId, username, message }) => {
        const timestamp = new Date().toLocaleTimeString();
        const room = chatRooms[roomId];

        // Check if the room exists and hasn't expired
        if (room && new Date() < room.expiresAt) {
            const newMessage = { username, message, timestamp };
            room.messages.push(newMessage); // Save the message
            io.to(roomId).emit("message", newMessage); // Broadcast to the room
        }
    });

    socket.on("disconnect", () => {
        console.log("A user disconnected.");
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
});
