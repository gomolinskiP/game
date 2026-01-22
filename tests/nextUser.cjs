const fs = require("fs");
class Logger {
    constructor(path) {
        this.logFilePath = path;
        this.maxLogFilePath = this.logFilePath.slice(0, -4) + "_max.txt";
        this.recent = [];
        this.firstValTimestamp_ns = process.hrtime.bigint();
    }

    logOne(val) {
        fs.writeFileSync(this.logFilePath, String(val) + "\n", {
            encoding: "utf8",
            flag: "a+",
            mode: 0o666,
        });
    }

    pushRecent(val) {
        this.recent.push(val);

        // if(!this.firstValTimestamp_ns){
        //     this.firstValTimestamp_ns = process.hrtime.bigint();
        // }
    }

    logRecentAvarage() {
        const len = this.recent.length;
        if (len <= 0) {
            fs.writeFileSync(this.logFilePath, "none" + "\n", {
                encoding: "utf8",
                flag: "a+",
                mode: 0o666,
            });
            return;
        }

        const avarage = this.recent.reduce((a, b) => a + b) / len;
        const max = Math.max(...this.recent);

        //log avg:
        fs.writeFileSync(this.logFilePath, String(avarage) + "\n", {
            encoding: "utf8",
            flag: "a+",
            mode: 0o666,
        });

        //log max:
        fs.writeFileSync(this.maxLogFilePath, String(max) + "\n", {
            encoding: "utf8",
            flag: "a+",
            mode: 0o666,
        });

        this.firstValTimestamp_ns = process.hrtime.bigint();

        this.recent = [];
    }

    logTotalPerSecond() {
        const len = this.recent.length;
        if (len <= 0) {
            fs.writeFileSync(this.logFilePath, "none" + "\n", {
                encoding: "utf8",
                flag: "a+",
                mode: 0o666,
            });
            return;
        }
        const meassurementTime_ns =
            process.hrtime.bigint() - this.firstValTimestamp_ns;
        const meassurementTime_s = Number(meassurementTime_ns) / 1e9;
        const totalPerSecond =
            this.recent.reduce((a, b) => a + b) / meassurementTime_s;

        const maxPerSecond = Math.max(...this.recent);

        fs.writeFileSync(this.logFilePath, String(totalPerSecond) + "\n", {
            encoding: "utf8",
            flag: "a+",
            mode: 0o666,
        });

        //log max:
        fs.writeFileSync(this.maxLogFilePath, String(maxPerSecond) + "\n", {
            encoding: "utf8",
            flag: "a+",
            mode: 0o666,
        });

        console.log(Number(meassurementTime_ns) / 1e9);

        this.firstValTimestamp_ns = process.hrtime.bigint();

        this.recent = [];
    }
}

const io = require("socket.io-client");
// require("dotenv").config();
// console.log(
//     "SESSION_SECRET loaded in processor:",
//     process.env.SESSION_SECRET ? "✅" : "❌"
// );

const pingLogger = new Logger("logs/perf/ping.txt");

let globalCounter = 0;

function nextUser(context, events, done) {
    console.log("globalCounter", globalCounter);
    context.vars.username = `loadUser${globalCounter++}`;
    return done();
}

function storeSessionCookie(req, res, context, events, done) {
    const cookie = res.headers["set-cookie"];

    console.log("cookie", cookie);
    if (cookie && cookie.length > 0) {
        context.vars.sessionCookie = cookie
            .map((c) => c.split(";")[0])
            .join("; ");
    } else {
        console.error("No session cookie in login response");
    }

    done();
}

function connectSocket(context, events, done) {
    const { username } = context.vars;
    const cookie = context.vars.sessionCookie;

    console.log(cookie);

    if (!cookie) {
        console.error("no session cookie while connecting to WebSocket.");
        return done();
    }

    const baseUrl = "https://localhost:2000";

    const socket = io(baseUrl, {
        transports: ["websocket"],
        reconnection: false,
        rejectUnauthorized: false,
        extraHeaders: {
            Cookie: cookie,
        },
        query: {
            username: username,
        },
    });

    socket.on("connect", () => {
        console.log(`${username} connected`);
        pingLogger.logRecentAvarage();

        setTimeout(() => {
            socket.emit("startGame");

            //start shooting:
            socket.emit("keyPress", {
                inputId: 2,
                state: true,
            });

            setInterval(() => {
                const dir = Math.floor(Math.random() * 8);
                const state = Boolean(Math.round(Math.random()));
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
            }, 100);

            setTimeout(() => {
                done();
            }, 10000);
        }, 500);
    });

    //simulate sending back "init" finished ack:
    socket.on("init", () => {
        setTimeout(() => {
            socket.emit("initialized");
        }, 100);
    });

    //respawn if died:
    socket.on("update", (data) => {
        if (data.death) {
            setTimeout(() => {
                socket.emit("respawn");
            }, 500);
        }
    });

    //simulate ping meassurements:
    function measurePing() {
        const t0 = Date.now();
        socket.emit("pingCheck", t0);
    }
    setInterval(measurePing, 5000);
    socket.on("pongCheck", (data) => {
        const t3 = Date.now();
        const t0 = data.t0;

        const latency = t3 - t0;
        pingLogger.pushRecent(latency);
    });
}

module.exports = { nextUser, storeSessionCookie, connectSocket };
