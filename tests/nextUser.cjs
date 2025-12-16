const io = require("socket.io-client");
require("dotenv").config();
console.log(
    "SESSION_SECRET loaded in processor:",
    process.env.SESSION_SECRET ? "✅" : "❌"
);


let globalCounter = 0;

function nextUser(context, events, done){
    console.log("globalCounter", globalCounter);
    context.vars.username = `loadUser${globalCounter++}`;
    return done();
}

function storeSessionCookie(req, res, context, events, done){
    const cookie = res.headers["set-cookie"];

    console.log('cookie', cookie)
    if(cookie && cookie.length > 0){
        context.vars.sessionCookie = cookie.map((c) => c.split(";")[0]).join("; ");
    } else{
        console.error("No session cookie in login response");
    }

    done();
}

function connectSocket(context, events, done){
    const { username } = context.vars;
    const cookie = context.vars.sessionCookie;

    console.log(cookie);

    if(!cookie){
        console.error("no session cookie while connecting to WebSocket.");
        return done();
    }

    const baseUrl = "https://localhost:2000";

    const socket = io(baseUrl, {
        transports: ["websocket"],
        reconnection: false,
        rejectUnauthorized: false,
        extraHeaders: {
            Cookie: cookie
        },
        query: {
            username: username
        }
    });

    socket.on("connect", ()=>{
        console.log(`${username} connected`);

        setTimeout(()=>{
            socket.emit("startGame");

            
            socket.emit("keyPress", {
                inputId: 2,
                state: true,
            });

            setInterval(()=>{
                const dir = Math.floor(Math.random()*8);
                const state = Boolean(Math.round(Math.random()))
                let key;

                switch (dir) {
                    case 0:
                        key = "up";
                        break;
                    case 1:
                        key = "down";
                        break;
                    case 2:
                        key = "left";
                        break;
                    case 3:
                        key = "right";
                        break;
                }

                socket.emit("keyPress", {
                    inputId: key,
                    state: state,
                });
            },100);

            setTimeout(()=>{
                done();
            }, 10000);

        }, 1000);
    })

}

module.exports = {nextUser, storeSessionCookie, connectSocket};