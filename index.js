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
app.get('/', (req, res) => {
    return res.sendFile(path.resolve('./public/index.html'));
});

app.get('/chat/:roomId', (req, res) => {
    return res.sendFile(path.resolve('./public/chat.html')); 
});

io.on("connection", (socket) => {
    console.log("A user connected!");

    socket.on("join-room", (roomId) => {
        socket.join(roomId);

        if (chatRooms[roomId]) {
            socket.emit("load-messages", chatRooms[roomId]);
        } else {
            chatRooms[roomId] = []; 
        }
        console.log(`User joined room: ${roomId}`);
    });

    socket.on("message", ({ roomId, username, message }) => {
        const timestamp = new Date().toLocaleTimeString();

        const newMessage = { username, message, timestamp };
        chatRooms[roomId].push(newMessage);
        fs.writeFile('test.json', JSON.stringify(chatRooms), err => {
            if (err) {
              console.error(err,"something went wrong");
            }
          });

        console.log(chatRooms);
        io.to(roomId).emit("message", newMessage);
    });

    socket.on("disconnect", () => {
        console.log("A user disconnected!");
    });
});

const PORT = process.env.PORT ;
server.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
