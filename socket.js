import { createRequire } from 'module';
const require = createRequire(import.meta.url);

import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class Entity{
    constructor(x, y){
        this.x = x;
        this.y = y;
    }
}

export class Player extends Entity{
    constructor(id, x, y, username){
        super(x, y);
        this.id = id;
        this.name = username;

        this.socketIDs = [id];
        this.needsUpdate = true;
        this.pressingUp = false;
        this.pressingDown = false;
        this.pressingLeft = false;
        this.pressingRight = false;
        this.pressingSpace = false;
        this.speed = 10;
        this.lastAngle = 90;
        this.shootTimeout = false;

        return this;
    }

    updatePosition(){
        if(this.pressingUp){
            this.dirY = -1
        } 
        else if(this.pressingDown){
            this.dirY = 1
        }
        else{
            this.dirY = 0
        }
        if(this.pressingLeft){
            this.dirX = -1
        }
        else if(this.pressingRight){
            this.dirX = 1
        }
        else{
            this.dirX = 0
        }

        if(!this.pressingUp && !this.pressingDown && !this.pressingLeft && !this.pressingRight)
            this.needsUpdate = false
        else{
            this.dirY *= 58/100 //SCALER if map image is in perspective
            this.lastAngle = Math.atan2(this.dirY, this.dirX) * 180/Math.PI;
            this.spdX = Math.cos(this.lastAngle/180*Math.PI) * this.speed
            this.spdY = Math.sin(this.lastAngle/180*Math.PI) * this.speed

            this.x += this.spdX
            this.y += this.spdY
        }

        if(this.pressingSpace){

            if(!this.shootTimeout){
                this.shootTimeout = true;
                let bulletId = Math.random()
                new Bullet(this, this.lastAngle)

                setTimeout(()=>{
                    this.shootTimeout = false
                }, 100)
            }
        }
    }
}

export class Bullet extends Entity{
    static list = {};

    constructor(parent, angle){
        super(parent.x, parent.y);
        this.id = Math.random();
        this.parent = parent;
        this.speed = 20;

        this.spdX = Math.cos(angle/180*Math.PI) * this.speed;
        this.spdY = Math.sin(angle/180*Math.PI) * this.speed;

        Bullet.list[this.id] = this;
        setTimeout(()=>{
            // delete itself after timeout??
            removePack.bullet.push(this.id)
            delete Bullet.list[this.id]
        }, 1000)
        return this;
    }

    update(){
        this.x += this.spdX;
        this.y += this.spdY;
    }
}

let initPack = {player: [], bullet: []};
let updatePack = {player: [], bullet: []};
let removePack = {player: [], bullet: []};

export default function webSocketSetUp(serv, ses, db){

    //socket.io:
    var socketList = {};
    var playerList = {};

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

        //check if user is already in game on another socket:
        let loggedPlayer = Object.values(playerList).find(player => player.name === username)
        if(loggedPlayer != undefined){
            player = playerList[loggedPlayer.id]
            player.socketIDs.push(socket.id)


            initPack.selfId = player.id;
            socket.emit('init', initPack)
            player.needsUpdate = true
            // console.log(playerList[loggedPlayer.id])
        }
        else{
            //retrieve player progress:
            db.progress.find({username: username}, function(err, res){
                if(res.length > 0){
                    //progress already in DB
                    player = new Player(socket.id, res[0].x, res[0].y, username)
                                    
                }
                else{
                    //no progress, set starting values
                    player = new Player(socket.id, 250, 250, username);
                    db.progress.insert({username: username, x: 250, y: 250})
                }
                playerList[socket.id] = player;

                // console.log(playerList)
                initPack.player = []
                for(var i in playerList){
                    initPack.player.push({
                        x: playerList[i].x,
                        y: playerList[i].y,
                        id: playerList[i].id,
                        name: playerList[i].name,
                    })
                }

                initPack.selfId = player.id;
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
                        playerList[player.socketIDs[0]] = player;
                        delete playerList[socket.id]
                        removePack.player.push(socket.id)
                        console.log(removePack.player)
                    }
                } else{
                    delete playerList[socket.id];
                    removePack.player.push(socket.id)
                    console.log(removePack.player)
                }
                
                // TODO: if player is logged from more than one socket and the first one disconnects it deletes player for other sockets as well - have to fix this - (edit: I THINK I MANAGED TO DO IT)
                db.progress.update({username: username}, {$set: {x: player.x, y: player.y}});
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

        socket.on('noteTest', function(){
            // console.log()

            for(var i in playerList){
                var socket = socketList[i];
                socket.emit('playTestNote');
            }
        })
    })





    //main loop:
    setInterval(function(){
        var pack = [];

        for(var i in playerList){ 
            var player = playerList[i];
            
            if(player.needsUpdate){
                player.updatePosition();
                updatePack.player.push({
                    x: player.x,
                    y: player.y,
                    id: player.id,
                    name: player.name
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
                })
        }

        //emit to all sockets:
        for(var i in socketList){
            var socket = socketList[i];

            if(updatePack.player.length || updatePack.bullet.length){
                socket.emit('update', updatePack)
            }
            
            if(removePack.player.length || removePack.bullet.length){
                socket.emit('remove', removePack)
            }
        }
        
        updatePack.player = []
        removePack.player = []
        updatePack.bullet = []
        removePack.bullet = []
    }, 1000/25);
}