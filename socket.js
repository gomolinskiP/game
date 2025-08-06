import { createRequire } from 'module';
const require = createRequire(import.meta.url);

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFile } from 'fs/promises';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { Socket } from './classes/Socket.js';
import { Player } from './classes/Player.js';
import { Bot } from './classes/Bot.js';
import { Bullet, scheduledBullet } from './classes/Bullet.js';
import { Pickup } from './classes/Pickup.js';
import { Scale } from './classes/Scale.js';
import { Character } from './classes/Character.js';
import { Tile } from './classes/Tile.js';

import Quadtree from '@timohausmann/quadtree-js';


let mapData = await loadMapData();
export let collisionLayer = await loadCollisionLayer(mapData, 'collision');
export let bulletCollisionLayer = await loadCollisionLayer(mapData, 'bulletCollision')

async function loadMapData() {
    const filePath = resolve(__dirname, './client/img/map2.json');
    const jsonData = JSON.parse(await readFile(filePath, 'utf-8'));

    return jsonData;
}

function loadCollisionLayer(mapData, layerName){
    for(let layer of mapData.layers){
        if(layer.name == layerName){

            return layer;
        }
    }
    return null; //if layer not found return null;
}

function isoToScreen(x, y){
    return{
        x: (x-y),
        y: (x+y)/2
    }
}

function screenToIso(x, y){
    return{
        x: (2*y + x)/2,
        y: (2*y - x)/2
    }
}

export function checkWallCollision(x, y, collisionLayer){
    const {x: isoObjX, y: isoObjY} = screenToIso(x, y)

    for(let isoRect of collisionLayer.objects){
        if(isoObjX >= isoRect.x - 20 &&
        isoObjX <= isoRect.x + isoRect.width - 0 &&
            isoObjY >= isoRect.y - 50 &&
            isoObjY <= isoRect.y + isoRect.height - 32
        ){
            return true;
        }
    }
    return false;
}

function rectColl(r1, r2){
    return(r1.x + r1.w > r2.x &&
        r1.x < r2.x + r2.w &&
        r1.y + r1.h > r2.y &&
        r1.y < r2.y + r2.h
    )
}


function loadLayerTiles(layer){
    let tileArr = []
    let wallOffset = 0;
    if(layer.name.includes("wall")){
        let wallLayerNum = parseInt(layer.name.replace("wall", ""));
        wallOffset = 32 * wallLayerNum;
    }

    for(const chunk of layer.chunks){
        const width = chunk.width;
        const height = chunk.height;
        const tileW = 64;
        const tileH = 32;
        const offsetX = layer.offsetx || 0;
        const offsetY = layer.offsety || 0;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const index = y * width + x;
                const gid = chunk.data[index];
                if(gid == 0) continue;

                // if (!gid || !tileImages[gid]) continue;

                // const img = tileImages[gid];

                // position:
                const tileX = chunk.x + x;
                const tileY = chunk.y + y;

                //tile coordinates in orthogonal system (in game coordinates):
                const ortX = (tileX - tileY) * tileW / 2 + offsetX; //weird shift TO FIX
                const ortY = (tileX + tileY) * tileH / 2 + offsetY - tileH + wallOffset;

                let scr = screenToIso(ortX, ortY)

                tileArr.push({
                    gid: gid,
                    x: scr.x,
                    y: scr.y,
                    width: 32,
                    height: 32
                })
                // new Tile(gid, tileX, tileY, ortX, ortY);
            }
        }
    }

    return tileArr;
}

export function checkTileLayerCollision(x, y, layer){

}

export function checkTilesCollision(x, y, tileArr){
    let {x: isoObjX, y: isoObjY} = screenToIso(x, y)

    let objRect = {
        x: isoObjX + 12,
        y: isoObjY + 44,
        w: 0,
        h: 0
    }

    for(let tile of tileArr){
        let tileRect = {
            x: tile.x,
            y: tile.y,
            w: tile.width,
            h: tile.height
        }

        if(rectColl(tileRect, objRect)){
            return true;
        };
    }
    return false;
}

let floorLayer = loadCollisionLayer(mapData, "floor");
export let floorTiles = loadLayerTiles(floorLayer);

let wall1Layer = loadCollisionLayer(mapData, "wall1");
let wall2Layer = loadCollisionLayer(mapData, "wall2");
let wall1Tiles = loadLayerTiles(wall1Layer)
let wall2Tiles = loadLayerTiles(wall2Layer)
export let wallTiles = wall1Tiles.concat(wall2Tiles)





export let scale = new Scale('F#', 'major');

export default async function webSocketSetUp(serv, ses, Progress){
    //socket.io:

    var io = require('socket.io')(serv, {
    cors: {
        origin: "http://localhost:2000",
        methods: ["GET", "POST"],
        transports: ['websocket', 'polling'],
        credentials: true
    },
    allowEIO3: true
    });

    io.use((socket, next)=>{
        ses(socket.request, {}, next)
    })

    //user connects to the game subpage:
    io.sockets.on('connection', async function(socket){
        //save new socket in socket list:
        socket.id = new Socket(socket).id;
        console.log(`Socket connection: id=${socket.id}...`);

        let player = null;

        //get username from logged session:
        let username = socket.request.session?.user?.username;
        if(username == undefined){
            console.log("ERROR: username is undefined")
            socket.emit('redirect', "/")
            return;
        }

        //check if user is already in game on another socket:
        let loggedPlayer = Object.values(Player.list).find(player => player.name === username)
        if(loggedPlayer != undefined){
            //
            console.log(`>>>>MULTISOCKET DETECTED<<<<`)
            await Progress.updateOne({username: loggedPlayer.name}, {$set: {x: loggedPlayer.x, y: loggedPlayer.y, score: loggedPlayer.score}});
            Socket.list[loggedPlayer.id].emit('redirect', "/");
            delete Player.list[loggedPlayer.id];
            delete Character.list[loggedPlayer.id];
        }
        //retrieve player progress:
        let res = await Progress.findOne({username: username});
            if(res){
                //progress already in DB
                console.log(res)
                player = new Player(socket.id, res.x, res.y, username, res.weapon, res.score)
                //teleport player if they're stuck in collision area:
                if(checkWallCollision(player.x, player.y, collisionLayer)){
                    player.x = 0;
                    player.y = 0;
                }
            }
            else{
                //no progress, set starting values
                player = new Player(socket.id, 0, 0, username);
                Progress.insertOne({username: username, x: 0, y: 0, score: 0})
            }
        // }
                
        socket.on('disconnect', async function(){
            //socket disconnected
            console.log(`socket disconnected (id=${socket.id})...`)

            for(let i in Player.list){
                    let player = Player.list[i]
                    player.addToRemovePack(socket.id, "player");
            }
            delete Player.list[socket.id];
            delete Character.list[socket.id];

                

            try{
                await Progress.updateOne({username: username}, {$set: {x: player.x, y: player.y, score: player.score}});

                console.log("progress saved");
            }
            catch(err){
                console.error(`Error with saving progress to database: ${err}`);
            }
            
            username = null;
             
            delete Socket.list[socket.id];
        })

        socket.on('keyPress', function(data){
            if(player != null){
                player.needsUpdate = true

                switch(data.inputId){
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
                        player.pressingSpace = data.state;
                        break;
                }
            }
        })

        socket.on('noteChange', (note)=>{
            player.changeSelectedNote(note);
        })

        socket.on('chat', function(msg){
            let signedMsg = `<b>${player.name}:</b> ${msg}`;
            for(var i in Socket.list){
                var socket = Socket.list[i];
                socket.emit('chatBroadcast', signedMsg);
            }
        })
    })


    //main loop:
    setInterval(function(){
        //construct quadtree of Characters (Players and Bots):
        // let characterQTree = new Quadtree({
        //     x: leftMapBound,
        //     y: topMapBound,
        //     width: mapWidth,
        //     height: mapHeight
        // });

        // random pickup spawn:
        if(Math.random()<0.1 && Object.keys(Pickup.list).length<50){
            // console.log("pickup spawned")
            new Pickup();
        }

        // random bot spawn:
        // if(Math.random()<0.1 && Object.keys(Bot.list).length<10){
        //     console.log("bot spawned")
        //     new Bot();
        // }

        Pickup.handleAll(Character.list, Socket.list);
        Bullet.updateAll();
        Player.updateAll();
    }, 1000/25);

    const BPM = 120;
    const beatInterval = 60000/BPM;
    let tick = 0;

    //music time intervals:
    setInterval(()=>{
        const now = Date.now();

        //emit metronome signal:
        if(tick%2 == 0){
            for(var i in Socket.list){
                var socket = Socket.list[i];
                socket.emit("tick", {now, tick});
            }
        }

        for(var i in scheduledBullet.list){ 
            var bullet = scheduledBullet.list[i];
            let durationInt = parseInt(bullet.duration.replace("n", ""));
            let eightsNum = 8/durationInt;

            if(bullet.durationType == "dotted") eightsNum /= 2;

            if(tick%eightsNum == 0){
                bullet.spawn();
                delete scheduledBullet.list[i];
            }
        }

        tick++;
    }, beatInterval/2)
}

