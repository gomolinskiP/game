import { createRequire } from 'module';
const require = createRequire(import.meta.url);

import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export var Player = function(id, x, y, username){
    var self = {
        x: x,
        y: y,
        id: id,
        name: username,
        socketIDs: [id],
        needsUpdate: true,
        pressingUp: false,
        pressingDown: false,
        pressingLeft: false,
        pressingRight: false,
        pressingSpace: false,
        speed: 10,
        lastAngle: 90,
        shootTimeout: false,
    }


    self.updatePosition = function(){
        
        

        if(self.pressingUp){
            self.dirY = -1
        } 
        else if(self.pressingDown){
            self.dirY = 1
        }
        else{
            self.dirY = 0
        }
            
        if(self.pressingLeft){
            self.dirX = -1
        }
            
        else if(self.pressingRight){
            self.dirX = 1
        }
        else{
            self.dirX = 0
        }

        if(!self.pressingUp && !self.pressingDown && !self.pressingLeft && !self.pressingRight)
            self.needsUpdate = false
        else{
            self.dirY *= 58/100 //SCALER if map image is in perspective
            self.lastAngle = Math.atan2(self.dirY, self.dirX) * 180/Math.PI;
            self.spdX = Math.cos(self.lastAngle/180*Math.PI) * self.speed
            self.spdY = Math.sin(self.lastAngle/180*Math.PI) * self.speed

            self.x += self.spdX
            self.y += self.spdY
        }

        

        if(self.pressingSpace){

            if(!self.shootTimeout){
                self.shootTimeout = true;
                let bulletId = Math.random()
                Bullet(self, self.lastAngle)

                setTimeout(()=>{
                    self.shootTimeout = false
                }, 100)
            }
            
        }
    }

    return self;
}

export var Bullet = function(parent, angle){
    let self = {
        id: Math.random(),
        parent: parent,
        x: parent.x,
        y: parent.y,
        speed: 20,
    }

    self.spdX = Math.cos(angle/180*Math.PI) * self.speed
    self.spdY = Math.sin(angle/180*Math.PI) * self.speed

    self.update = function(){
        self.x += self.spdX;
        self.y += self.spdY;
    }

    setTimeout(()=>{
        // delete itself after timeout??
        delete Bullet.list[self.id]
        removePack.bullet.push(self.id)

    }, 1000)

    Bullet.list[self.id] = self;

    return self;
}
Bullet.list = {};


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
            // console.log(playerList[loggedPlayer.id])
        }
        else{
            //retrieve player progress:
            db.progress.find({username: username}, function(err, res){
                if(res.length > 0){
                    //progress already in DB
                    player = Player(socket.id, res[0].x, res[0].y, username)
                                    
                }
                else{
                    //no progress, set starting values
                    player = Player(socket.id, 250, 250, username);
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
                // pack.push({
                //     x: player.x,
                //     y: player.y,
                //     name: player.name
                // })
                // console.log(pack)
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
            
            // if(player.needsUpdate){
                bullet.update();
                // pack.push({
                //     x: player.x,
                //     y: player.y,
                //     name: player.name
                // })
                // console.log(pack)
                updatePack.bullet.push({
                    x: bullet.x,
                    y: bullet.y,
                    id: bullet.id,
                })
            // }
        }

        //emit to all sockets:
        for(var i in socketList){
            var socket = socketList[i];

            if(updatePack.player.length>0 || updatePack.bullet.length>0){
                socket.emit('update', updatePack)
            }
            

            if(removePack.player.length>0 || removePack.bullet.length>0){
                socket.emit('remove', removePack)
            }
            
        }
        
        updatePack.player = []
        removePack.player = []
        updatePack.bullet = []
        removePack.bullet = []
    }, 1000/25);
}