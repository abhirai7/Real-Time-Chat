const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const chatRooms = {}; 
const userCounts = {}; 

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
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // Room expires in 15 minutes
        chatRooms[roomId] = { messages: [], expiresAt };

        console.log(`Room created: ${roomId}, expires at ${expiresAt}`);
        socket.emit("room-created", { roomId, expiresAt });

        setTimeout(() => {
            delete chatRooms[roomId];
            delete userCounts[roomId];
            console.log(`Room expired: ${roomId}`);
        }, 15 * 60 * 1000);
    });

    socket.on("join-room", (roomId) => {
        const room = chatRooms[roomId];

        if (room && new Date() < room.expiresAt) {
            socket.join(roomId);

            if (!userCounts[roomId]) userCounts[roomId] = 0;
            userCounts[roomId]++;

            io.to(roomId).emit("update-user-count", userCounts[roomId]);

            console.log(`User joined room: ${roomId}, Users in room: ${userCounts[roomId]}`);

            socket.emit("load-messages", { messages: room.messages, expiresAt: room.expiresAt });

            socket.on("disconnect", () => {
                if (userCounts[roomId]) {
                    userCounts[roomId]--;
                    if (userCounts[roomId] <= 0) {
                        delete userCounts[roomId];
                    } else {
                        io.to(roomId).emit("update-user-count", userCounts[roomId]);
                    }
                }
                console.log(`A user disconnected from room: ${roomId}, Remaining users: ${userCounts[roomId] || 0}`);
            });
        } else {
            socket.emit("room-expired");
        }
    });

    socket.on("message", ({ roomId, avatar, username, message }) => {
        const timestamp = new Date().toLocaleTimeString();
        const room = chatRooms[roomId];

        if (room && new Date() < room.expiresAt) {
            const newMessage = { avatar, username, message, timestamp };
            room.messages.push(newMessage);

            fs.writeFileSync(`./public/messages/${roomId}.json`, JSON.stringify(room.messages));

            io.to(roomId).emit("message", newMessage);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
});
