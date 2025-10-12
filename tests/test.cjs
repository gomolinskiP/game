const { io } = require("socket.io-client");
const fs = require("fs");

module.exports = {
    // 🧠 zapisuje cookie z odpowiedzi /login
    storeSessionCookie: function (req, res, context, ee, next) {
        const cookieHeader = res.headers["set-cookie"];
        if (cookieHeader && cookieHeader.length > 0) {
            // zachowujemy cookie do kontekstu, żeby potem wysłać w handshake
            context.vars.sessionCookie = cookieHeader[0].split(";")[0];
        }
        return next();
    },

    // 🎮 symulacja gracza po zalogowaniu
    connectAndPlay: function (context, events, done) {
        const cookie = context.vars.sessionCookie;
        if (!cookie) {
            console.error("No session cookie found!");
            return done();
        }

        const socket = io("http://localhost:3000", {
            transports: ["websocket"],
            extraHeaders: {
                Cookie: cookie, //przekazujemy cookie sesji
            },
            reconnection: false,
            ca: fs.readFileSync("./certs/server.cert"),
        });

        socket.on("connect", () => {
            console.log(`Connected as ${cookie}`);
            socket.emit("join_game");

            // symulacja akcji
            const interval = setInterval(() => {
                socket.emit("move", {
                    x: Math.floor(Math.random() * 500),
                    y: Math.floor(Math.random() * 500),
                });
            }, 500);

            setTimeout(() => {
                clearInterval(interval);
                socket.disconnect();
                done();
            }, 10000); // gracz gra przez 10 sekund
        });

        socket.on("connect_error", (err) => {
            console.error("Socket error:", err.message);
            done();
        });
    },
};
