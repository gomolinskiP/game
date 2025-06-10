var socket = io();

// game:

let gameWidth = window.innerWidth;
let gameHeight = window.innerHeight;

var canvas = document.getElementById("ctx");
var ctx = canvas.getContext("2d");


class Entity{
    constructor(initPack){
        this.x = initPack.x;
        this.y = initPack.y;
        this.id = initPack.id;

        this.pan3d = new Tone.Panner3D(
            0,
            0,
            0
        );
        this.pan3d.connect(limiter);
    }

    update(pack){
        this.x = pack.x
        this.y = pack.y
        if(Player.list[selfId]){
            this.pan3d.setPosition(
                (this.x - Player.list[selfId].x)*0.1,
                (this.y - Player.list[selfId].y)*0.1,
                0
            );
        }
    }
}

class Player extends Entity{
    static list = {};

    constructor(initPack){
        super(initPack);
        this.name = initPack.name;

        this.synthTimeout = false;
        this.footstepSyn = new Tone.NoiseSynth(synOptions);
        this.footstepSyn.connect(this.pan3d);

        Player.list[this.id] = this;
    }

    update(pack){
        if(this.x !== pack.x || this.y !== pack.y){
            super.update(pack);

            if(!this.synthTimeout){
                this.synthTimeout = true;
                this.footstepSyn.triggerAttackRelease("128n");
                setTimeout(()=>{
                    this.synthTimeout = false;
                }, 250);
            }
        }
    }
}

class Bullet extends Entity{
    static list = {};

    constructor(initPack){
        super(initPack);
        this.synth = new Tone.DuoSynth();
        this.pan3d.setPosition(
            (this.x - Player.list[selfId].x)*0.1,
            (this.y - Player.list[selfId].y)*0.1,
            0
        )
        this.synth.connect(this.pan3d);

        Bullet.list[this.id] = this;

        this.interval = setInterval(()=>{
            // this.synth.triggerAttackRelease("C5", "64n");
        }, 200);

        this.synth.triggerAttackRelease("C6", "2n");
    }

    destroy(){
        clearInterval(this.interval);
        // this.synth.triggerAttackRelease("C3", "32n");

        setTimeout(()=>{
            this.synth.dispose();
            this.pan3d.dispose();
            delete Bullet.list[this.id]
        }, 500);
    }
}

let synOptions = {
    noise:{
        type: "pink"
    },
    envelope:{
        attack: 0.35,
        decay: 0.15,
    }
}

const limiter = new Tone.Compressor(
    -0.1,
    20
)
const reverb = new Tone.Reverb();
limiter.connect(reverb)
reverb.toDestination();


let selfId = null;

canvasResize()

function canvasResize() {
    gameWidth = window.innerWidth;
    gameHeight = window.innerHeight - 50;
    canvas.width = gameWidth;
    canvas.height = gameHeight;
};

window.addEventListener('resize', canvasResize);


const Img = {}

Img.player = new Image();
Img.player.src = "../img/placeholder.png"

Img.map = new Image();
Img.map.src = "../img/map.jpg"

function drawMap(){
    if(Player.list[selfId]){
        let x = gameWidth/2 - Player.list[selfId].x;
        let y = gameHeight/2 - Player.list[selfId].y;
        ctx.drawImage(Img.map, x, y)
    }
    
}

socket.on('init', function(data){
    selfId = data.selfId;
    console.log("InitPack:")
    console.log(data)
    for(var i=0; i<data.player.length; i++){
        new Player(data.player[i]);
    }

    for(var i=0; i<data.bullet.length; i++){
        new Bullet(data.bullet[i]);
    }
})

socket.on('update', function(data){
    // console.log("updatePack:")
    // console.log(data)

    for(var i=0; i<data.player.length; i++){
        let pack = data.player[i]
        let p = Player.list[pack.id]

        if(p){
            p.update(pack);   
        } else{
            new Player(data.player[i]);
        }
    }

    for(var i=0; i<data.bullet.length; i++){
        let pack = data.bullet[i]
        let b = Bullet.list[pack.id]

        if(b){
            b.update(pack);
        } else{
            let b = new Bullet(data.bullet[i]);
        }
    }
})

socket.on('remove', function(data){
    for(var i=0; i<data.player.length; i++){
        delete Player.list[data.player[i]]
    }
    for(var i=0; i<data.bullet.length; i++){
        Bullet.list[data.bullet[i]].destroy();
    }
    console.log("removePack:")
    console.log(data)
})

//game Loop:
function gameLoop(){
    // console.log(Player.list)
    ctx.fillStyle = "#006e56";
    ctx.strokeStyle = "red";
    ctx.fillRect(0, 0, gameWidth, gameHeight);

    drawMap()

    ctx.beginPath();
    ctx.roundRect(10, 20, 150, 100, 0);
    ctx.stroke();

    ctx.fillStyle = "black";
    for(var i in Player.list){
        ctx.textAlign = "center";
        if(Player.list[i].id == selfId){
            ctx.filter = "hue-rotate(180deg)"
            ctx.font = 'bold 20px Cascadia Mono';
        }
        else{
            ctx.font = '16px Cascadia Mono';
        }

        let x = Player.list[i].x - Player.list[selfId].x + gameWidth/2;
        let y = Player.list[i].y - Player.list[selfId].y + gameHeight/2;

        ctx.drawImage(Img.player, x-32, y-32);
        ctx.filter = "none";
        ctx.fillText(Player.list[i].name, x, y-32);
    };

    for(var i in Bullet.list){
        let x = Bullet.list[i].x - Player.list[selfId].x + gameWidth/2;
        let y = Bullet.list[i].y - Player.list[selfId].y + gameHeight/2;

        ctx.fillRect(x-5, y-5, 10, 10);
    }

    requestAnimationFrame(gameLoop)
}
requestAnimationFrame(gameLoop);


//key handling:
document.onkeydown = function(event){
    switch(event.key){
        case "d":
            socket.emit('keyPress', {
            inputId: 'right',
            state: true
            });
            break;
        case "s":
            socket.emit('keyPress', {
            inputId: 'down',
            state: true
            });
            break;
        case "a":
            socket.emit('keyPress', {
            inputId: 'left',
            state: true
            });
            break;
        case "w":
            socket.emit('keyPress', {
            inputId: 'up',
            state: true
            });
            break;
        case " ":
            socket.emit('keyPress', {
                inputId: 'space',
                state: true
            });
            // socket.emit('noteTest');
            break;
    }
}

document.onkeyup = function(event){
    switch(event.key){
        case "d":
            socket.emit('keyPress', {
            inputId: 'right',
            state: false
            });
            break;
        case "s":
            socket.emit('keyPress', {
            inputId: 'down',
            state: false
            });
            break;
        case "a":
            socket.emit('keyPress', {
            inputId: 'left',
            state: false
            });
            break;
        case "w":
            socket.emit('keyPress', {
            inputId: 'up',
            state: false
            });
            break;
        case " ":
            socket.emit('keyPress', {
            inputId: 'space',
            state: false
            });
            break;
    }
}



const playBTN = document.getElementById("sound-btn");

const synth = new Tone.Synth().toDestination();
const synth2 = new Tone.Synth().toDestination();

playBTN.addEventListener("click", ()=>{
    if(Tone.context.state != "running")
        Tone.start();

    socket.emit('noteTest')
    console.log(Bullet.list)
    // synth.triggerAttackRelease("C3", "8n");
})