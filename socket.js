import { createRequire } from 'module';
const require = createRequire(import.meta.url);

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFile } from 'fs/promises';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { Socket } from './classes/Socket.js';
import { Player } from './classes/Player.js';
import { Bullet, scheduledBullet } from './classes/Bullet.js';
import { Pickup } from './classes/Pickup.js';
import { Scale } from './classes/Scale.js';


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
            return;
        }

        //check if user is already in game on another socket:
        let loggedPlayer = Object.values(Player.list).find(player => player.name === username)
        if(loggedPlayer != undefined){
            console.log(`>>>>MULTISOCKET DETECTED<<<<`)
            //TODO maybe redirect previous socket to homepage and force disconnect?
            player = Player.list[loggedPlayer.id]
            player.socketIDs.push(socket.id)
        }
        else{
            //retrieve player progress:
            let res = await findProgressByUsername(db, username);
                if(res){
                    //progress already in DB
                    player = new Player(socket.id, res.x, res.y, username, res.weapon)
                    if(checkWallCollision(player.x, player.y, collisionLayer)){
                        player.x = 0;
                        player.y = 0;
                    }
                }
                else{
                    //no progress, set starting values
                    player = new Player(socket.id, 0, 0, username);
                    db.progress.insert({username: username, x: 0, y: 0})
                }
        }
                
        socket.on('disconnect', function(){
            //socket disconnected
            console.log(`socket disconnected (id=${socket.id})...`)

            //check if player is logged from multiple sockets:
            if(player.socketIDs.length > 1){
                    //if yes remove this socket from the player object
                    let index = player.socketIDs.indexOf(socket.id)
                    if(index > -1){
                        player.socketIDs.splice(index, 1)
                        Player.list[player.socketIDs[0]] = player;
                        delete Player.list[socket.id]
                        for(let i in Player.list){
                            let player = Player.list[i]
                            player.removePack.push({
                                id: socket.id,
                                type: "player"
                            })
                        }
                    }
                } else{
                    delete Player.list[socket.id];
                    for(let i in Player.list){
                            let player = Player.list[i]
                            player.removePack.push({
                                id: socket.id,
                                type: "player"
                            })
                    }
                }
                
                // TODO: if player is logged from more than one socket and the first one disconnects it deletes player for other sockets as well - have to fix this - (edit: I THINK I MANAGED TO DO IT)
                db.progress.update({username: username}, {$set: {x: player.x, y: player.y}});
                console.log("PROGRESS SAVED!")
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
        // random pickup spawn:
        if(Math.random()<0.1 && Object.keys(Pickup.list).length<50){
            // console.log("pickup spawned")
            new Pickup();
        }

        Pickup.handleAll(Player.list, Socket.list);
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

