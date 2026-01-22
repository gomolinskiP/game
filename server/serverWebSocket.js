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

import { Logger } from "./classes/Logger.js";

import cookie from "cookie";
import signature from "cookie-signature";
import { AdminCommand } from "./classes/AdminCommand.js";
import { start } from "repl";

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

const GAME_TICKS_PER_S = 25;
const GAME_TICK_TIME_MS = 1000 / GAME_TICKS_PER_S;

const outWSLogger = new Logger("logs/perf/WS-out.txt");
const inWSLogger = new Logger("logs/perf/WS-in.txt");

const isPerfTestMode = Boolean(Number(process.env.PERF_TESTING)); 
const perfTestingType = process.env.PERF_TESTING_TYPE;

export default async function webSocketSetUp(serv, ses, Progress) {
    //socket.io:
    const io = require("socket.io")(serv, {
        cors: {
            origin: "http://localhost:2000",
            methods: ["GET", "POST"],
            transports: ["websocket", "polling"],
            credentials: true,
        },
        allowEIO3: true,
    });

    //use session:
    io.engine.use((req, res, next) => {
        ses(req, {}, next);
    });


    //user connects to the game subpage:
    io.sockets.on("connection", async function (socket) {
        if(isPerfTestMode){
            perfTest();
        }


        //for Artillery testing:
        const handshakeQuery = socket.handshake.query;

        //save new socket in socket list:
        socket.id = new Socket(socket).id;
        console.log(`Socket connection: id=${socket.id}...`);
        let player = null;

        //get username from logged session:
        let username = socket.request.session?.user?.username;
        
        //Artillery had problem with session cookies - handshake query fallback:
        if (Boolean(Number(process.env.PERF_TESTING)) == true && handshakeQuery.username) {
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
            bpm: Sounds.bpm
        });

        //wait for player starting the game after preload:
        socket.on("startGame", function(){
            player.startGame();
        })

        socket.on("disconnect", async function () {
            if (isPerfTestMode) {
                perfTest();
            }

            //socket disconnected
            console.log(`socket disconnected (id=${socket.id})...`);

            for (let i in Player.list) {
                let player = Player.list[i];
                player.addToRemovePack(socket.id, "player");
            }
            
            Player.list[socket.id].remove();
            // Character.list[socket.id].remove();
            // delete Character.list[socket.id];

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

        //incoming ws traffic meassurement:
        socket.onAny((eventName, payload)=>{
            if(!isPerfTestMode) return;
            if(perfTestingType != "WS") return;

            const nameSize_B = eventName.length * 8;
            let payloadSize_B;
            if(payload){
                payloadSize_B = Buffer.byteLength(JSON.stringify(payload));
            }
            else{
                payloadSize_B = 0;
            }

            inWSLogger.pushRecent(nameSize_B + payloadSize_B);
        });

        //outgoing ws traffic meassurement:
        socket.onAnyOutgoing((eventName, payload)=>{
            if (!isPerfTestMode) return;
            if (perfTestingType != "WS") return;

            const nameSize_B = eventName.length * 8;
            let payloadSize_B;
            if(payload){
                payloadSize_B = Buffer.byteLength(JSON.stringify(payload));
                // console.log("outgoing", eventName, bytes, "bytes");
            }
            else{
                // console.log("outgoing", eventName);
                payloadSize_B = 0;
            }

            outWSLogger.pushRecent(nameSize_B + payloadSize_B);
        });
    });

    const isBotTrainingMode = Boolean(Number(process.env.BOT_TRAINING)); 
    if(isBotTrainingMode) Bot.manageNumber();

    let lastTickT;
    let tickT;
    let tickT_diff;
    const tickTLogger = new Logger("logs/perf/tickT.txt");

    // function gameTick(){
    //     //reconstruct quadtrees for dynamic objects:
    //     Character.refreshQuadtree();
    //     Bullet.refreshQuadtree();
    //     Pickup.refreshQuadtree();

    //     //chance for random Pickup & Bot spawn:
    //     Pickup.randomSpawn();
    //     // Bot.randomSpawn();

    //     //handle & update all game objects:
    //     Pickup.handleAll();
    //     Bullet.updateAll();
    //     Player.updateAll();

    //     //time between game loop ticks:
    //     if (!lastTickT) {
    //         lastTickT = process.hrtime.bigint();
    //     } else {
    //         tickT = process.hrtime.bigint();
    //         tickT_diff = Number(tickT - lastTickT);
    //         tickTLogger.pushRecent(Number(tickT - lastTickT) / 1e6); //in ms
    //         lastTickT = tickT;
    //     }

    //     if (isPerfTestMode) {
    //         tickTLogger.pushRecent(tickT_diff / 1e6); //in ms
    //     }

    //     // const nextGameTickIn_ms = tickT_diff ? 
    //     //                             gameUpdateTickTimeMs - (tickT_diff/1e6 - gameUpdateTickTimeMs)
    //     //                              : gameUpdateTickTimeMs;

    //     // console.log(tickT_diff / 1e6, nextGameTickIn_ms)

    //     setTimeout(gameTick, nextGameTickIn_ms);
    // }

    // gameTick();

    //main game loop:
    setInterval(function () {
        const startT = process.hrtime.bigint();
        //reconstruct quadtrees for dynamic objects:
        Character.refreshQuadtree();
        Bullet.refreshQuadtree();
        Pickup.refreshQuadtree();

        const quadtreeRefreshT = process.hrtime.bigint();

        //chance for random Pickup & Bot spawn:
        Pickup.randomSpawn();
        // Bot.randomSpawn();

        //handle & update all game objects:
        Pickup.handleAll();
        const pickupHandleT = process.hrtime.bigint();
        Bullet.updateAll();
        const bulletHandleT = process.hrtime.bigint();
        Player.updateAll();
        const playerHandleT = process.hrtime.bigint();

        const entityHandleT = process.hrtime.bigint();

        if (isPerfTestMode && perfTestingType=="tickT") {
            logTickTime();
        }

        const endT = process.hrtime.bigint();

        // console.log('tick took', Number(endT - startT) / 1e6, 'ms',
        // 'qt refreshing took', Number(quadtreeRefreshT - startT) / 1e6, 'ms',
        // 'handling obj took', Number(entityHandleT - quadtreeRefreshT) / 1e6, 'ms',
        // 'handling pickups took', Number(pickupHandleT - quadtreeRefreshT) / 1e6, 'ms',
        // 'handling bullets took', Number(bulletHandleT - pickupHandleT) / 1e6, 'ms',
        // 'handling players took', Number(playerHandleT - bulletHandleT) / 1e6, 'ms')
    }, GAME_TICK_TIME_MS);

    
    const cpuUserLogger = new Logger("logs/perf/cpu-User.txt");
    const cpuSystemLogger = new Logger("logs/perf/cpu-system.txt");
    const ramRSSLogger = new Logger("logs/perf/ram-rss.txt");
    const ramHeapLogger = new Logger("logs/perf/ram-heapUsed.txt");
    const ramExtLogger = new Logger("logs/perf/ram-external.txt");

    
    let playerNum = Object.keys(Player.list).length;
    
    function logTickTime(){
        //time between game loop ticks:
        if (!lastTickT) {
            lastTickT = process.hrtime.bigint();
        } else {
            tickT = process.hrtime.bigint();
            tickT_diff = Number(tickT - lastTickT);
            tickTLogger.pushRecent(Number(tickT - lastTickT) / 1e6); //in ms
            lastTickT = tickT;
        }
    }

    function perfTest(){
        //logg recent on player num change:
        if (playerNum != Object.keys(Player.list).length) {
            console.log("logging for", playerNum, "players");
            switch(perfTestingType){
                case "tickT":
                    tickTLogger.logRecentAvarage();
                    break;
                case "CPU":
                    cpuUserLogger.logRecentAvarage();
                    cpuSystemLogger.logRecentAvarage();
                    break;
                case "RAM":
                    ramRSSLogger.logRecentAvarage();
                    ramHeapLogger.logRecentAvarage();
                    ramExtLogger.logRecentAvarage();
                    break;
                case "WS":
                    inWSLogger.logTotalPerSecond();
                    outWSLogger.logTotalPerSecond();
                    break;
                default:
                    console.warn("Unknown performance testing type!");
                    break;
            }

            playerNum = Object.keys(Player.list).length;
        }
    }

    let lastCPU = process.cpuUsage();
    let lastCPUmeassureTime = process.hrtime.bigint();
    let diffCPU;
    let cpuMeassureDeltaTime;
    let ramUsage;
    
    if (isPerfTestMode){
        setInterval(() => {
            switch (perfTestingType) {
                case "tickT":
                    break;
                case "CPU":
                    //CPU:
                    diffCPU = process.cpuUsage(lastCPU);
                    lastCPU = process.cpuUsage();
                    cpuMeassureDeltaTime = Number(
                        process.hrtime.bigint() - lastCPUmeassureTime
                    );
                    lastCPUmeassureTime = process.hrtime.bigint();

                    cpuUserLogger.pushRecent((diffCPU.user * 1e3) / cpuMeassureDeltaTime);
                    cpuSystemLogger.pushRecent((diffCPU.system * 1e3) / cpuMeassureDeltaTime);
                    break;
                case "RAM":
                    //RAM:
                    ramUsage = process.memoryUsage();
                    ramRSSLogger.pushRecent(ramUsage.rss);
                    ramHeapLogger.pushRecent(ramUsage.heapUsed);
                    ramExtLogger.pushRecent(ramUsage.external);
                    break;
                case "WS":
                    break;
                default:
                    console.warn("Unknown performance testing type!");
                    break;
            }       
        }, 1000);
    }
        

    console.log("✅ WebSocket ready.");
}
