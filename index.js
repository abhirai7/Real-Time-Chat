const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const chatRooms = {};

app.use(express.static(path.resolve("./public")));

app.get("/", (req, res) => {
    res.sendFile(path.resolve("./public/index.html"));
});

app.get("/chat/:roomId", (req, res) => {
    const roomId = req.params.roomId;

    if (chatRooms[roomId] && new Date() < chatRooms[roomId].expiresAt) {
        res.sendFile(path.resolve("./public/chat.html"));
    } else {
        res.status(404).sendFile(path.resolve("./public/404.html"));
    }
});

io.on("connection", (socket) => {
    console.log("A user connected.");

    socket.on("create-room", (roomId) => {
        const expiresAt = new Date(Date.now() + 15
         * 60 * 1000);
        chatRooms[roomId] = { messages: [], expiresAt };

        console.log(`Room created: ${roomId}, expires at ${expiresAt}`);
        socket.emit("room-created", { roomId, expiresAt });

        setTimeout(() => {
            delete chatRooms[roomId];
            console.log(`Room expired: ${roomId}`);
        }, 15 * 60 * 1000); 
    });

    socket.on("join-room", (roomId) => {
        const room = chatRooms[roomId];

        if (room && new Date() < room.expiresAt) {
            socket.join(roomId);
            console.log(`User joined room: ${roomId}`);

            socket.emit("load-messages", { messages: room.messages, expiresAt: room.expiresAt });
        } else {
            socket.emit("room-expired");
        }
    });

    socket.on("message", ({ roomId, username, message }) => {
        const timestamp = new Date().toLocaleTimeString();
        const room = chatRooms[roomId];

        if (room && new Date() < room.expiresAt) {
            const newMessage = { username, message, timestamp };
            room.messages.push(newMessage); 
            fs.writeFileSync(`./public/messages/${roomId}.json`, JSON.stringify(room.messages));
            io.to(roomId).emit("message", newMessage); 
        }
    });

    socket.on("disconnect", () => {
        console.log("A user disconnected.");
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
});
