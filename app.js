const { transports } = require('engine.io');
var express = require('express');
var app = express();
var serv = require('http').Server(app);


//express for file communication:
app.get('/', function(req, res){
    res.sendFile(__dirname + '/client/index.html');
});
app.use('/client', express.static(__dirname + '/client'));
app.use(express.static('client'));
serv.listen(2000);
console.log("Server started.");

//socket.io:
var socketList = {};
var playerList = {};

var Player = function(id){
    var self = {
        x: 250,
        y: 250,
        id: id,
        number: "" + Math.floor(10*Math.random()),
        pressingUp: false,
        pressingDown: false,
        pressingLeft: false,
        pressingRight: false,
        speed: 5,
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

var io = require('socket.io')(serv, {
    cors: {
        origin: "http://localhost:2000",
        methods: ["GET", "POST"],
        transports: ['websocket', 'polling'],
        credentials: true
    },
    allowEIO3: true
});

//user connects to the app:
io.sockets.on('connection', function(socket){
    socket.id = Math.random();
    socketList[socket.id] = socket;
    console.log("Socket connection: id=" + socket.id);


    let player = null;
    socket.on('signIn', function(data){
        if(data.username === 'test' && data.password === 'test'){
            socket.emit('signInResponse', {success: true});
            player = Player(socket.id);
            playerList[socket.id] = player;
        }
        else{
            socket.emit('signInResponse', {success: false});
            socket.emit('error', "Wrong username or password.");
        }
    })

    socket.on('signOut', function(){
        if(player != null){
            socket.emit('signOutResponse');
            player = null;
            delete playerList[socket.id];
        }
        else{
            socket.emit('error', "Cannot logout, because user is not signed in.");
        }
    })



    socket.on('disconnect', function(){
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
        for(var i in socketList){
            var socket = socketList[i];
            socket.emit('playTestNote');
        }
    })
})

setInterval(function(){
    var pack = [];

    for(var i in playerList){
        var player = playerList[i];
        player.updatePosition();
        pack.push({
            x: player.x,
            y: player.y,
            number: player.number
        })
    }

    for(var i in playerList){
        var socket = socketList[i];
        socket.emit('newPosition', pack);
    }
}, 1000/25);