import { createRequire } from "module";
const require = createRequire(import.meta.url);

import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { readFile } from "fs/promises";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { Socket } from "./classes/Socket.js";
import { Player } from "./classes/Player.js";
import { Bot } from "./classes/Bot.js";
import { Bullet } from "./classes/Bullet.js";
import { Pickup } from "./classes/Pickup.js";
import { Character } from "./classes/Character.js";
import { Tile } from "./classes/Tile.js";
import { Sounds } from "./classes/Sounds.js";
import { Map } from "./classes/Map.js";

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

    io.use((socket, next) => {
        ses(socket.request, {}, next);
    });

    //user connects to the game subpage:
    io.sockets.on("connection", async function (socket) {
        //save new socket in socket list:
        socket.id = new Socket(socket).id;
        console.log(`Socket connection: id=${socket.id}...`);

        let player = null;

        //get username from logged session:
        let username = socket.request.session?.user?.username;
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
            //
            console.log(`>>>>MULTISOCKET DETECTED<<<<`);
            await Progress.updateOne(
                { username: loggedPlayer.name },
                {
                    $set: {
                        x: loggedPlayer.x,
                        y: loggedPlayer.y,
                        score: loggedPlayer.score,
                    },
                }
            );
            Socket.list[loggedPlayer.id].emit("redirect", "/");
            delete Socket.list[loggedPlayer.id];
            delete Player.list[loggedPlayer.id];
            delete Character.list[loggedPlayer.id];
        }
        //retrieve player progress:
        let res = await Progress.findOne({ username: username });
        if (res) {
            //progress already in DB
            player = new Player(
                socket.id,
                res.x,
                res.y,
                username,
                res.weapon,
                res.score
            );

            //teleport player if they're stuck in collision area:
            if (
                Tile.checkTilesCollision(player.x, player.y, Tile.wallQTree) ||
                !Tile.checkTilesCollision(player.x, player.y, Tile.floorQTree)
            ) {
                player.x = 0;
                player.y = 0;
            }
        } else {
            //no progress, set starting values
            player = new Player(socket.id, 0, 0, username);
            Progress.insertOne({ username: username, x: 0, y: 0, score: 0 });
        }
        // }

        socket.on("disconnect", async function () {
            //socket disconnected
            console.log(`socket disconnected (id=${socket.id})...`);

            for (let i in Player.list) {
                let player = Player.list[i];
                player.addToRemovePack(socket.id, "player");
            }
            delete Player.list[socket.id];
            delete Character.list[socket.id];

            try {
                await Progress.updateOne(
                    { username: username },
                    { $set: { x: player.x, y: player.y, score: player.score } }
                );

                console.log("progress saved");
            } catch (err) {
                console.error(`Error with saving progress to database: ${err}`);
            }

            username = null;

            delete Socket.list[socket.id];
        });

        socket.on("keyPress", function (data) {
            if (player != null) {
                player.needsUpdate = true;

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
                    case "space":
                        console.log(`keypress space`);
                        player.shoot();
                        break;
                }
            }
        });

        socket.on("noteFire", (note) => {
            player.changeSelectedNote(note);
            player.shoot();
        });

        socket.on("noteChange", (note) => {
            player.changeSelectedNote(note);
        });

        socket.on("chat", function (msg) {
            //TODO VALIDATE MSG test:
            const sanitizedMsg = msg
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;");

            let signedMsg = `<b>${player.name}:</b> ${sanitizedMsg}`;
            for (var i in Socket.list) {
                var socket = Socket.list[i];
                socket.emit("chatBroadcast", signedMsg);
            }
        });

        socket.on("weaponChange", (change) => {
            // console.log(change)
            player.weapon.change(change);
        });
    });

    //main loop:
    setInterval(function () {
        //reconstruct quadtrees for dynamic objects:
        Character.refreshQuadtree();
        Bullet.refreshQuadtree();
        Pickup.refreshQuadtree();

        // random pickup spawn:
        if (Math.random() < 0.1 && Object.keys(Pickup.list).length < 0) {
            // console.log("pickup spawned")
            new Pickup();
        }

        // random bot spawn:
        if(Math.random()<0.1 && Object.keys(Bot.list).length<40){
            // console.log("bot spawned")
            new Bot();
        }

        Pickup.handleAll(Character.list, Socket.list);
        Bullet.updateAll();
        Player.updateAll();
    }, 1000 / 25);

    console.log("✅ WebSocket ready.");
}
