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

    isColliding(other){
        let dx = this.x - other.x;
        let dy = this.y - other.y;
        let distSq = dx*dx + dy*dy;

        if(distSq < 500) return true;
        else return false;
    }
}

export class Player extends Entity{
    static list = {}

    constructor(id, x, y, username, weapon){
        super(x, y);
        this.id = id;
        this.name = username;
        this.hp = 100;
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

        this.giveWeapon(weapon.sound, weapon.duration);
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
                new Bullet(this, this.lastAngle)

                setTimeout(()=>{
                    this.shootTimeout = false
                }, 100)
            }
        }
    }

    giveWeapon(sound, duration){
        this.weapon = new Weapon(sound, duration)
        console.log(this.weapon)
    }

    takeDmg(damage){
        this.hp -= damage;
        if(this.hp <= 0) this.die();
        this.needsUpdate = true;
    }

    die(){
        this.hp = 100;
        this.x = 250 + 100*(Math.random()-0.5);
        this.y = 250 + 100*(Math.random()-0.5);
        this.needsUpdate = true;
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

        this.sound = parent.weapon.sound;
        this.duration = parent.weapon.duration;

        Bullet.list[this.id] = this;
        this.timeout = setTimeout(()=>{
            // delete itself after timeout??
            this.destroy();
        }, 1000)
        return this;
    }

    update(){
        this.x += this.spdX;
        this.y += this.spdY;

        //collision check
        for(let i in Player.list){
            let targetPlayer = Player.list[i];
            if(this.parent != targetPlayer && this.isColliding(targetPlayer)){
                clearTimeout(this.timeout);
                this.destroy();
                targetPlayer.takeDmg(1);
            }
        }
    }

    destroy(){
        removePack.bullet.push(this.id)
        delete Bullet.list[this.id]
    }
}

export class Weapon{
    constructor(sound, duration){
        this.sound = sound;
        this.duration = duration;
    }
}

let initPack = {player: [], bullet: []};
let updatePack = {player: [], bullet: []};
let removePack = {player: [], bullet: []};

export default function webSocketSetUp(serv, ses, db){

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

        //check if user is already in game on another socket:
        let loggedPlayer = Object.values(Player.list).find(player => player.name === username)
        if(loggedPlayer != undefined){
            player = Player.list[loggedPlayer.id]
            player.socketIDs.push(socket.id)


            initPack.selfId = player.id;
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
                        hp: Player.list[i].hp
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
    })

    //main loop:
    setInterval(function(){
        var pack = [];

        for(var i in Player.list){ 
            var player = Player.list[i];
            
            if(player.needsUpdate){
                player.updatePosition();
                updatePack.player.push({
                    x: player.x,
                    y: player.y,
                    id: player.id,
                    name: player.name,
                    hp: player.hp
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
                    duration: bullet.duration
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