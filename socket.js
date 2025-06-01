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
        pressingUp: false,
        pressingDown: false,
        pressingLeft: false,
        pressingRight: false,
        speed: 10,
    }
    self.updatePosition = function(){
        if(self.pressingUp)
            self.y -= self.speed;
        if(self.pressingDown)
            self.y += self.speed;
        if(self.pressingLeft)
            self.x -= self.speed;
        if(self.pressingRight)
            self.x += self.speed;
    }

    return self;
}


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
                    }
                } else{
                    delete playerList[socket.id];
                }
                
                // TODO: if player is logged from more than one socket and the first one disconnects it deletes player for other sockets as well - have to fix this - (edit: I THINK I MANAGED TO DO IT)
                db.progress.update({username: username}, {$set: {x: player.x, y: player.y}});
                username = null;
             
            delete socketList[socket.id];
        })

        socket.on('keyPress', function(data){
            if(player != null){
                if(data.inputId === 'up')
                    player.pressingUp = data.state;
                else if(data.inputId === 'down')
                    player.pressingDown = data.state;
                else if(data.inputId === 'left')
                    player.pressingLeft = data.state;
                else if(data.inputId === 'right')
                    player.pressingRight = data.state;
            }
        })

        socket.on('noteTest', function(){
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
            player.updatePosition();
            pack.push({
                x: player.x,
                y: player.y,
                name: player.name
            })
        }

        for(var i in socketList){
            var socket = socketList[i];
            socket.emit('newPosition', pack);
        }
    }, 1000/25);
}