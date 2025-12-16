import { createRequire } from "module";
const require = createRequire(import.meta.url);

import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { readFile } from "fs/promises";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { Socket } from "./classes/Socket.js";
import { Player } from "./classes/game-objects/Player.js";
import { Bot } from "./classes/game-objects/Bot.js";
import { Bullet } from "./classes/game-objects/Bullet.js";
import { Pickup } from "./classes/game-objects/Pickup.js";
import { Character } from "./classes/game-objects/Character.js";
import { Tile } from "./classes/game-objects/Tile.js";
import { Sounds } from "./classes/musical/Sounds.js";
import { Map } from "./classes/Map.js";

import cookie from "cookie";
import signature from "cookie-signature";
import { AdminCommand } from "./classes/AdminCommand.js";

//Start server-side metronome ticking:
Sounds.metronomeTick();

//prepare map data from Tiled JSON file:
await Map.loadMapData();
Map.updateMapBoundRect();
Map.loadAllTiles();

//construct all tiles QuadTree:
Tile.createQuadtree(Map.boundRect);
//floor & wall quadtrees for collisions:
Tile.createFloorQTree(Map.boundRect);
Tile.createWallQTree(Map.boundRect);

//Create empty quadtrees for dynamic object classes:
Character.createQuadtree(Map.boundRect);
Bullet.createQuadtree(Map.boundRect);
Pickup.createQuadtree(Map.boundRect);

Bot.startAgentStep();

const gameUpdateTickTimeMs = 1000 / 25;

export default async function webSocketSetUp(serv, ses, Progress) {
    //socket.io:

    var io = require("socket.io")(serv, {
        cors: {
            origin: "http://localhost:2000",
            methods: ["GET", "POST"],
            transports: ["websocket", "polling"],
            credentials: true,
        },
        allowEIO3: true,
    });

    io.engine.use((req, res, next) => {
        ses(req, {}, next);
    });

    // A to specjalny parser dla cookie z Artillery:
    // io.use((socket, next) => {
    //     try {
    //         const rawCookie = socket.request.headers.cookie;
    //         if (!rawCookie) {
    //             console.error("❌ No cookie in socket handshake headers");
    //             return next(new Error("No cookie in handshake"));
    //         }

    //         const cookies = cookie.parse(rawCookie);
    //         const raw = cookies["cookieName"];
    //         if (!raw) {
    //             console.error(
    //                 "❌ No cookieName found in cookie string:",
    //                 cookies
    //             );
    //             return next(new Error("Session cookie not found"));
    //         }

    //         // raw wygląda np. jak: s%3AOjoWC8BRLSV1NnJr6J92_UqLlB75hZYT.yqkWGFShI%2BTDAZesD55Mqan9qKUXGoBLP%2B%2FmGzD%2BjF0
    //         const decoded = decodeURIComponent(raw); // usuń %3A i %2B
    //         if (!decoded.startsWith("s:")) {
    //             console.error("❌ Cookie missing s: prefix", decoded);
    //             return next(new Error("Malformed session cookie"));
    //         }

    //         const signedPart = decoded.slice(2); // usuwa "s:"
    //         const unsigned = signature.unsign(
    //             signedPart,
    //             process.env.SESSION_SECRET
    //         );

    //         if (!unsigned) {
    //             console.error("❌ Cookie signature invalid");
    //             return next(new Error("Bad cookie signature"));
    //         }

    //         // zapisz ID w socket.request
    //         socket.request.sessionID = unsigned;

    //         // spróbuj wczytać sesję z MongoStore:
    //         mongoStore.get(unsigned, (err, sessionObj) => {
    //             if (err) {
    //                 console.error("❌ Error reading session:", err);
    //                 return next(err);
    //             }
    //             if (!sessionObj) {
    //                 console.error("❌ No session found for ID", unsigned);
    //                 return next(new Error("Session not found"));
    //             }

    //             console.log("✅ Session found for", unsigned, sessionObj);
    //             socket.request.session = sessionObj;
    //             next();
    //         });
    //     } catch (err) {
    //         console.error("❌ Exception in socket auth middleware", err);
    //         next(err);
    //     }
    // });

    // io.use((socket, next) => {
    //     ses(socket.request, {}, next);
    // });

    //user connects to the game subpage:
    io.sockets.on("connection", async function (socket) {

        //for Artillery testing:
        const handshakeQuery = socket.handshake.query;

        //save new socket in socket list:
        socket.id = new Socket(socket).id;
        console.log(`Socket connection: id=${socket.id}...`);
        let player = null;

        //get username from logged session:
        let username = socket.request.session?.user?.username;
        
        //Artillery had problem with session cookies - handshake query fallback:
        if (Boolean(process.env.PERF_TESTING) == true && handshakeQuery.username) {
            username = handshakeQuery.username;
        }

        //Check if username existed in user session:
        if (username == undefined) {
            console.log("ERROR: username is undefined");
            socket.emit("redirect", "/");
            return;
        }

        //check if user is already in game on another socket:
        let loggedPlayer = Object.values(Player.list).find(
            (player) => player.name === username
        );
        if (loggedPlayer) {
            //the player is currently playing from another socket
            console.log(`>>>>MULTISOCKET DETECTED<<<<`);

            //save their progress from that socket:
            await Progress.updateOne(
                { username: loggedPlayer.name },
                {
                    $set: {
                        x: loggedPlayer.x,
                        y: loggedPlayer.y,
                        score: loggedPlayer.score,
                        weapon: {
                            sound: loggedPlayer.weapon.sound,
                            type: loggedPlayer.weapon.type,
                            duration: loggedPlayer.weapon.duration,
                        },
                    },
                }
            );

            //force redirect on that socket to homepage
            Socket.list[loggedPlayer.id].emit("redirect", "/");

            // //delete previous socket & player object
            // delete Socket.list[loggedPlayer.id];
            // delete Player.list[loggedPlayer.id];
            // delete Character.list[loggedPlayer.id];
        }
        //retrieve player progress:
        let res = await Progress.findOne({ username: username });
        if (res) {
            //progress already in DB
            player = new Player(
                socket,
                res.x,
                res.y,
                username,
                res.weapon,
                res.score
            );

            //teleport player if they're stuck in collision area (due to map change):
            if (
                Tile.checkTilesCollision(player.x, player.y, Tile.wallQTree) ||
                !Tile.checkTilesCollision(player.x, player.y, Tile.floorQTree)
            ) {
                player.x = 0;
                player.y = 0;
            }
        } else {
            //no progress, set starting values
            player = new Player(socket, 0, 0, username);
            Progress.insertOne({ username: username, x: 0, y: 0, score: 0 });
        }

        //notify client about finishing checking progress in DB:
        socket.emit("dbProgressChecked", {
            selfID: socket.id,
        });

        //wait for player starting the game after preload:
        socket.on("startGame", function(){
            player.startGame();
        })

        socket.on("disconnect", async function () {
            //socket disconnected
            console.log(`socket disconnected (id=${socket.id})...`);

            for (let i in Player.list) {
                let player = Player.list[i];
                player.addToRemovePack(socket.id, "player");
            }
            delete Player.list[socket.id];
            Character.list[socket.id].remove();
            delete Character.list[socket.id];

            //update player progress on disconnect:
            try {
                await Progress.updateOne(
                    { username: username },
                    { $set: { x: player.x, y: player.y, score: player.score, weapon: {
                        sound: player.weapon.sound,
                        type: player.weapon.type,
                        duration: player.weapon.duration
                    } } }
                );
            } catch (err) {
                console.error(`Error with saving progress to database: ${err}`);
            }

            username = null;

            delete Socket.list[socket.id];
        });

        socket.on("keyPress", function (data) {
            if (player != null) {
                // player.needsUpdate = true;

                //check if number (digits shoot)
                const isShot = !isNaN(data.inputId);
                if(isShot){
                    player.setShootingState(data.state, data.inputId - 1)
                    return;
                }

                switch (data.inputId) {
                    case "up":
                        player.pressingUp = data.state;
                        break;
                    case "down":
                        player.pressingDown = data.state;
                        break;
                    case "left":
                        player.pressingLeft = data.state;
                        break;
                    case "right":
                        player.pressingRight = data.state;
                        break;
                }
            }
        });

        socket.on("chat", function (msg) {
            //Allows to authorize as admin while knowing secret password:
            if(msg.includes(`!pw${process.env.ADMIN_PASSWORD}`)){
                player.isAdmin = true;
                console.log(player.name, ' autorized as admin');
                return;
            }

            //If authorized as admin allows to execute admin commands:
            if(msg[0] == "!" && player.isAdmin){
                AdminCommand.get(msg);
                return;
            }

            //replace < and > to prevent HTML/JS code injection:
            const sanitizedMsg = msg
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;");

            let signedMsg = `<b>${player.name}:</b> ${sanitizedMsg}`;
            for (var i in Socket.list) {
                var socket = Socket.list[i];
                socket.emit("chatBroadcast", signedMsg);
            }

            //TODO validate too long messages!!!
        });

        socket.on("weaponChange", (change) => {
            player.weapon.change(change);
        });

        socket.on("respawn", ()=>{
            if(!player.isDead) return;
            player.spawn();
            socket.emit("respawned");
        })

        socket.on("pingCheck", (t0) => {
            const t1 = Date.now();
            socket.emit("pongCheck", {
                t0: t0,
                t1: t1,
                t2: Date.now()
            });
        });

        socket.on("initialized", () => {
            socket.initialized = true;
        });
    });

    //main loop:
    setInterval(function () {
        //reconstruct quadtrees for dynamic objects:
        Character.refreshQuadtree();
        Bullet.refreshQuadtree();
        Pickup.refreshQuadtree();

        //chance for random Pickup & Bot spawn:
        Pickup.randomSpawn();
        Bot.randomSpawn();

        //handle & update all game objects:
        Pickup.handleAll();
        Bullet.updateAll();
        Player.updateAll();
    }, gameUpdateTickTimeMs);

    console.log("✅ WebSocket ready.");
}
