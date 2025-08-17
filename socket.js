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

let mapXmin = 0;
let mapXmax = 0;
let mapYmin = 0;
let mapYmax = 0;

let mapData = await loadMapData();

async function loadMapData() {
    const filePath = resolve(__dirname, './client/img/map3.json');
    const jsonData = JSON.parse(await readFile(filePath, 'utf-8'));

    return jsonData;
}

function loadLayer(mapData, layerName){
    for(let layer of mapData.layers){
        if(layer.name == layerName){

            return layer;
        }
    }
    return null; //if layer not found return null;
}

function screenToIso(x, y){
    return{
        x: (2*y + x)/2,
        y: (2*y - x)/2
    }
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

                //update global map bounds:
                if(ortX < mapXmin) mapXmin = ortX;
                if(ortX > mapXmax) mapXmax = ortX + 64;
                if(ortY < mapYmin) mapYmin = ortY;
                if(ortY > mapYmax) mapYmax = ortY + 64;

                let scr = screenToIso(ortX, ortY)

                tileArr.push({
                    layer: layer.name,
                    gid: gid,
                    isoX: scr.x,
                    isoY: scr.y,
                    width: 32,
                    height: 32,
                    x: ortX,
                    y: ortY,
                    wallOffset: wallOffset,
                })
            }
        }
    }

    return tileArr;
}

export function checkTilesCollision(x, y, quadtree){
    let {x: isoObjX, y: isoObjY} = screenToIso(x, y)

    //TODO this is ok for floor collision, but x, y, w & h should be different for wall collision
    let objRect = {
        x: isoObjX + 12,
        y: isoObjY + 44,
        w: 0,
        h: 0
    }

    const collCandidates = quadtree.retrieve({
        x: x - 32,
        y: y - 32,
        width: 64,
        height: 64
    });
    // console.log(`${tileArr.length} ${collCandidates.length}`);

    if(collCandidates.length < 1) return false;
    for(let candidate of collCandidates){
        let tileRect = {
            x: candidate.isoX,
            y: candidate.isoY,
            w: 32,
            h: 32,
        }

        if(rectColl(tileRect, objRect)){
            return true;
        };
    }

    return false;
}

let floorLayer = loadLayer(mapData, "floor");
export let floorTiles = loadLayerTiles(floorLayer);

let wall1Layer = loadLayer(mapData, "wall1");
let wall2Layer = loadLayer(mapData, "wall2");
let wall1Tiles = loadLayerTiles(wall1Layer)
let wall2Tiles = loadLayerTiles(wall2Layer)
export let wallTiles = wall1Tiles.concat(wall2Tiles)

//map bounds:
// console.log(`mapX: from ${mapXmin} to ${mapXmax}, mapY: from${mapYmin} to ${mapYmax}`)
export const mapBoundRect = {
    x: mapXmin,
    y: mapYmin,
    width: mapXmax - mapXmin,
    height: mapYmax - mapYmin
}

//load all map layers tiles:
let layerId = -4; //because 4 layers are lower than player
for(const layer of mapData.layers){
    if(layer.type !== "tilelayer" || layer.visible == false) continue;
    layerId += 1;

    let tileArr = loadLayerTiles(layer);
    for(const tile of tileArr){
        new Tile(tile.gid, tile.x, tile.y - tile.wallOffset, layerId);
    }
}
//construct all tiles QuadTree:
export const tileQTree = new Quadtree(mapBoundRect);
for(let id in Tile.list){
    const tile = Tile.list[id];
    tileQTree.insert({
        x: tile.x,
        y: tile.y,
        width: 64,
        height: 64,
        id: tile.id,
    })
}


//construct floor QuadTree:
export const floorQTree = new Quadtree(mapBoundRect);
for(let tile of floorTiles){
    floorQTree.insert({
        x: tile.x,
        y: tile.y,
        width: 64,
        height: 64,
        isoX: tile.isoX,
        isoY: tile.isoY
    })
}

//construct collision walls QuadTree:
export const wallQTree = new Quadtree(mapBoundRect);
for(let tile of wallTiles){
    wallQTree.insert({
        x: tile.x,
        y: tile.y,
        width: 64,
        height: 64,
        isoX: tile.isoX,
        isoY: tile.isoY
    })
}

export let characterQTree = new Quadtree(mapBoundRect);
export let bulletQTree = new Quadtree(mapBoundRect);
export let pickupQTree = new Quadtree(mapBoundRect);

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
        if(loggedPlayer){
            //
            console.log(`>>>>MULTISOCKET DETECTED<<<<`)
            await Progress.updateOne({username: loggedPlayer.name}, {$set: {x: loggedPlayer.x, y: loggedPlayer.y, score: loggedPlayer.score}});
            Socket.list[loggedPlayer.id].emit('redirect', "/");
            delete Socket.list[loggedPlayer.id]
            delete Player.list[loggedPlayer.id];
            delete Character.list[loggedPlayer.id];
        }
        //retrieve player progress:
        let res = await Progress.findOne({username: username});
            if(res){
                //progress already in DB
                player = new Player(socket.id, res.x, res.y, username, res.weapon, res.score)

                //teleport player if they're stuck in collision area:
                if(checkTilesCollision(player.x, player.y, wallQTree) || !checkTilesCollision(player.x, player.y, floorQTree)){
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
        //reconstruct quadtrees for dynamic objects:
        characterQTree.clear();
        bulletQTree.clear();
        pickupQTree.clear();

        for(let id in Character.list){
            const character = Character.list[id];
            characterQTree.insert({
                x: character.x - 32,
                y: character.y - 32,
                width: 64,
                height: 64,
                id: id
            })
        }
        for(let id in Bullet.list){
            const bullet = Bullet.list[id];
            bulletQTree.insert({
                x: bullet.x - 8,
                y: bullet.y - 8,
                width: 16,
                height: 16,
                id: id
            })
        }
        for(let id in Pickup.list){
            const pickup = Pickup.list[id];
            pickupQTree.insert({
                x: pickup.x - 4,
                y: pickup.y - 4,
                width: 8,
                height: 8,
                id: id
            })
        }

        // random pickup spawn:
        if(Math.random()<0.1 && Object.keys(Pickup.list).length<500){
            // console.log("pickup spawned")
            new Pickup();
        }

        // random bot spawn:
        if(Math.random()<0.1 && Object.keys(Bot.list).length<10){
            // console.log("bot spawned")
            new Bot();
        }

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

