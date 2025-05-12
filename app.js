const { transports } = require('engine.io');
var express = require('express');
var app = express();
var serv = require('http').Server(app);

//first start C:\Program Files\MongoDB\Server\8.0\bin> mongod
//mongoDB:
var mongojs = require('mongojs')
var db = mongojs('localhost:27017/mgrGame', ['account', 'progress']);

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
        db.account.find({username: data.username}, function(err, res){
            if(res.length > 0){
                //account exists
                if(res[0].password == data.password){
                    //password correct - sign in success
                    socket.emit('signInResponse', {success: true});
                    player = Player(socket.id);
                    playerList[socket.id] = player;
                }
                else{
                    //pasword incorrect
                        socket.emit('signInResponse', {success: false});
                        socket.emit('error', "Wrong password.");
                }
            }
            else{
                //incorrect username
                socket.emit('signInResponse', {success: false});
                socket.emit('error', "Wrong username.");
            }
        })
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

    socket.on('signUp', function(data){
        //HAVE TO ADD VALIDATION
        db.account.find({username: data.username}, function(err, res){
            if(res.length > 0){
                //acount already exists
                socket.emit('signUpResponse', {success: false});
                socket.emit('error', "Account with this username already exists.");
            }
            else{
                db.account.insertOne({username: data.username, password: data.password});
                socket.emit('error', "Account created.");
            }
        })
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


//main loop:
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