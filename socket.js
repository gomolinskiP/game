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

    //user connects to the app:
    io.sockets.on('connection', function(socket){
        socket.id = Math.random();
        socketList[socket.id] = socket;

        let player = null;

        console.log("Socket connection: id=" + socket.id);

        //get username from logged session:
        let username = socket.request.session?.user?.username;
        if(username == undefined){
            return;
        }

        //check if user is already in game on another socket:
        let loggedPlayer = Object.values(Player.list).find(player => player.name === username)
        if(loggedPlayer != undefined){
            player = Player.list[loggedPlayer.id]
            player.socketIDs.push(socket.id)


            initPack.selfId = player.id;
            initPack.selectedNote = player.selectedNote;
            socket.emit('init', initPack)
            player.needsUpdate = true
            // console.log(Player.list[loggedPlayer.id])
        }
        else{
            //retrieve player progress:
            db.progress.find({username: username}, function(err, res){
                if(res.length > 0){
                    //progress already in DB
                    player = new Player(socket.id, res[0].x, res[0].y, username, res[0].weapon)
                                    
                }
                else{
                    //no progress, set starting values
                    player = new Player(socket.id, 250, 250, username);
                    db.progress.insert({username: username, x: 250, y: 250})
                }

                Player.list[socket.id] = player;

                // console.log(Player.list)
                initPack.player = []
                for(var i in Player.list){
                    initPack.player.push({
                        x: Player.list[i].x,
                        y: Player.list[i].y,
                        id: Player.list[i].id,
                        name: Player.list[i].name,
                        hp: Player.list[i].hp,
                        direction: Player.list[i].lastAngle
                    })
                }
                initPack.pickup = []
                for(var i in Pickup.list){
                    initPack.pickup.push({
                        x: Pickup.list[i].x,
                        y: Pickup.list[i].y,
                        id: Pickup.list[i].id,
                    })
                }

                //TODO: fix code duplication here and lines above:
                initPack.selfId = player.id;
                initPack.selectedNote = player.selectedNote;
                socket.emit('init', initPack)
                player.needsUpdate = true
            }) 
        }
 
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
                        if(!player.shootTimeout) socket.emit('playNote');
                        player.pressingSpace = data.state;
                        break;
                }
            }
        })

        socket.on('noteChange', (note)=>{
            player.selectedNote = note;
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

        for(let i in Pickup.list){
            let pickup = Pickup.list[i]

            if(pickup.collidingPlayerId() != null){
                console.log(pickup.collidingPlayerId())
                Player.list[pickup.collidingPlayerId()].giveWeapon(pickup.sound, pickup.duration)

                pickup.destroy();
            }
                

            if(pickup.needsUpdate){
                updatePack.pickup.push({
                    x: pickup.x,
                    y: pickup.y,
                    id: pickup.id
                })

                pickup.needsUpdate = false;
            }
        }

        var pack = [];

        for(var i in Player.list){ 
            var player = Player.list[i];

            if(collisionLayer) checkWallCollision(player.x, player.y, collisionLayer)

            
            if(player.needsUpdate){
                player.updatePosition();
                updatePack.player.push({
                    x: player.x,
                    y: player.y,
                    id: player.id,
                    name: player.name,
                    hp: player.hp,
                    direction: player.lastAngle,
                })
            }
        }

        for(var i in Bullet.list){ 
            var bullet = Bullet.list[i];
            
                bullet.update();
                
                updatePack.bullet.push({
                    x: bullet.x,
                    y: bullet.y,
                    id: bullet.id,

                    sound: bullet.sound,
                    duration: bullet.duration,
                    note: bullet.note
                })
        }

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

        if(tick%2 == 0){
            for(var i in socketList){
                    var socket = socketList[i];
                    socket.emit("tick", {now, tick});
            }
        }

        // for(var i in Bullet.list){ 
        //     var bullet = Bullet.list[i];
        //     bullet.destroy();
        // }

        for(var i in scheduledBullet.list){ 
                var bullet = scheduledBullet.list[i];
                let durationInt = parseInt(bullet.duration.replace("n", ""));
                let eightsNum = 8/durationInt;


                if(tick%eightsNum == 0){
                    bullet.spawn();
                    delete scheduledBullet.list[i];
                }
            }

        // console.log(`Now: ${now}, tick: ${tick}`);
        tick++;
    }, beatInterval/2)
}

