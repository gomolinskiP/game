import { createRequire } from 'module';
const require = createRequire(import.meta.url);

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFile } from 'fs/promises';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// import {Entity, Player, Bullet, Weapon} from './classes.js'
import { Player } from './classes/Player.js';
import { Bullet, scheduledBullet } from './classes/Bullet.js';
import { Pickup } from './classes/Pickup.js';
import { Scale } from './classes/Scale.js';


let initPack = {player: [], bullet: [], pickup: []};
let updatePack = {player: [], bullet: [], pickup: []};
export let removePack = {player: [], bullet: [], pickup: []};

let mapData = await loadMapData();
export let collisionLayer = await loadCollisionLayer(mapData, 'collision');
export let bulletCollisionLayer = await loadCollisionLayer(mapData, 'bulletCollision')

async function loadMapData() {
    const filePath = resolve(__dirname, './client/img/map.json');
    const jsonData = JSON.parse(await readFile(filePath, 'utf-8'));

    return jsonData;
}

function loadCollisionLayer(mapData, layerName){
    for(let layer of mapData.layers){
        if(layer.name == layerName){

            // const collisionRects = layer.data.objects.map(obj=>{
            //     x: obj.x,
            //     y: obj.y,

            // })
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
        x: (2*y + x - 3531)/2,
        y: (2*y - x + 3531)/2
    }
}

export function checkWallCollision(x, y, collisionLayer){
    const {x: isoObjX, y: isoObjY} = screenToIso(x, y)

    for(let isoRect of collisionLayer.objects){
        if(isoObjX >= isoRect.x - 32 &&
        isoObjX <= isoRect.x + isoRect.width - 16 &&
            isoObjY >= isoRect.y - 32 &&
            isoObjY <= isoRect.y + isoRect.height - 16
        ){
            return true;
        }
    }
    return false;
}


export let scale = new Scale('G', 'major');

function findProgressByUsername(db, username){
    return new Promise((resolve, reject) => {
        db.progress.findOne({username: username}, function(err, res){
            if(err) return reject(err);
            resolve(res);
        })
    })
}

export default async function webSocketSetUp(serv, ses, db){
    //socket.io:
    var socketList = {};

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
        socket.id = Math.random();
        socketList[socket.id] = socket;
        console.log("Socket connection: id=" + socket.id);

        let player = null;

        //get username from logged session:
        let username = socket.request.session?.user?.username;
        if(username == undefined){
            console.log("ERROR: username is undefined")
            return;
        }

        //check if user is already in game on another socket:
        let loggedPlayer = Object.values(Player.list).find(player => player.name === username)
        if(loggedPlayer != undefined){
            player = Player.list[loggedPlayer.id]
            player.socketIDs.push(socket.id)
        }
        else{
            //retrieve player progress:
            let res = await findProgressByUsername(db, username);
                if(res){
                    //progress already in DB
                    player = new Player(socket.id, res.x, res.y, username, res.weapon)   
                }
                else{
                    //no progress, set starting values
                    player = new Player(socket.id, 250, 250, username);
                    db.progress.insert({username: username, x: 250, y: 250})
                }
        }
        
        socket.emit('init', player.getInitPack(Pickup.list))
        
        socket.on('disconnect', function(){
            //socket disconnected

            //check if player is logged from multiple sockets:
            if(player.socketIDs.length > 1){
                    //if yes remove this socket from the player object
                    let index = player.socketIDs.indexOf(socket.id)
                    if(index > -1){
                        player.socketIDs.splice(index, 1)
                        Player.list[player.socketIDs[0]] = player;
                        delete Player.list[socket.id]
                        removePack.player.push(socket.id)
                    }
                } else{
                    delete Player.list[socket.id];
                    removePack.player.push(socket.id)
                }
                
                // TODO: if player is logged from more than one socket and the first one disconnects it deletes player for other sockets as well - have to fix this - (edit: I THINK I MANAGED TO DO IT)
                db.progress.update({username: username}, {$set: {x: player.x, y: player.y, weapon: player.weapon}});
                username = null;
             
            delete socketList[socket.id];
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
            for(var i in socketList){
                var socket = socketList[i];
                socket.emit('chatBroadcast', signedMsg);
            }
        })
    })

    //main loop:
    setInterval(function(){
        // random pickup spawn:
        if(Math.random()<0.1 && Object.keys(Pickup.list).length<50){
            // console.log("pickup spawned")
            new Pickup();
        }

        Pickup.handleAll(Player.list, socketList, updatePack);

        Player.updateAll(updatePack);

        Bullet.updateAll(updatePack);

        //emit to all sockets:
        for(var i in socketList){
            var socket = socketList[i];

            if(updatePack.player.length || updatePack.bullet.length || updatePack.pickup.length){
                socket.emit('update', updatePack)
            }
            
            if(removePack.player.length || removePack.bullet.length || removePack.pickup.length){
                socket.emit('remove', removePack)
            }
        }
        
        updatePack.player = []
        removePack.player = []
        updatePack.bullet = []
        removePack.bullet = []

        updatePack.pickup = []
        removePack.pickup = []
    }, 1000/25);

    const BPM = 120;
    const beatInterval = 60000/BPM;
    let tick = 0;

    //music time intervals:
    setInterval(()=>{
        const now = Date.now();

        //emit metronome signal:
        if(tick%2 == 0){
            for(var i in socketList){
                var socket = socketList[i];
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

