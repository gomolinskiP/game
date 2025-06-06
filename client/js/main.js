var socket = io();

// game:

let gameWidth = window.innerWidth;
let gameHeight = window.innerHeight;

var ctx = document.getElementById("ctx").getContext("2d");
var canvas = document.getElementById("ctx")

var Player = function(initPack){
    var self = {
        x: initPack.x,
        y: initPack.y,
        id: initPack.id,
        name: initPack.name,
    }
    Player.list[self.id] = self;
    return self;
}
Player.list = {}


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
Img.map.src = "../img/map.png"

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
    console.log(data.player)
    for(var i=0; i<data.player.length; i++){
        new Player(data.player[i]);
    }
})

socket.on('update', function(data){
    console.log("updatePack:")
    console.log(data)

    for(var i=0; i<data.player.length; i++){
        let pack = data.player[i]
        let p = Player.list[pack.id]

        if(p){
            p.x = pack.x
            p.y = pack.y
        } else{
            new Player(data.player[i]);
        }
    }
})

socket.on('remove', function(data){
    for(var i=0; i<data.player.length; i++){
        delete Player.list[data.player[i]]
    }

    console.log("removePack:")
    console.log(data)
})


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

        ctx.drawImage(Img.player, x, y);
        ctx.filter = "none";
        ctx.fillText(Player.list[i].name, x, y);
    };

    requestAnimationFrame(gameLoop)
}

requestAnimationFrame(gameLoop);

// //game loop:
// setInterval(function(){
//     // console.log(Player.list)
//     ctx.fillStyle = "#006e56";
//     ctx.strokeStyle = "red";
//     ctx.fillRect(0, 0, gameWidth, gameHeight);

//     // drawMap()

//     ctx.beginPath();
//     ctx.roundRect(10, 20, 150, 100, 0);
//     ctx.stroke();

//     ctx.fillStyle = "black";
//     for(var i in Player.list){
//         ctx.textAlign = "center";
//         if(Player.list[i].id == selfId){
//             ctx.filter = "hue-rotate(180deg)"
//             ctx.font = 'bold 20px Cascadia Mono';
//         }
//         else{
//             ctx.font = '16px Cascadia Mono';
//         }
//         ctx.drawImage(Img.player, Player.list[i].x, Player.list[i].y);
//         ctx.filter = "none";
//         ctx.fillText(Player.list[i].name, Player.list[i].x, Player.list[i].y);
//     };
// }, 40)


// socket.on('newPosition', function(data){
//     console.log(selfId)
//     ctx.fillStyle = "#006e56";
//     ctx.strokeStyle = "red";
//     ctx.fillRect(0, 0, gameWidth, gameHeight);

//     drawMap()

//     ctx.beginPath();
//     ctx.roundRect(10, 20, 150, 100, 0);
//     ctx.stroke();

//     ctx.fillStyle = "black";
//     for(var i=0; i < data.length; i++){
//         ctx.drawImage(Img.player, data[i].x, data[i].y);
//         ctx.textAlign = "center";
//         ctx.font = '20px Cascadia Mono';
//         ctx.fillText(data[i].name, data[i].x, data[i].y);
//     };
// })


socket.on('playTestNote', function(){
    synth.triggerAttackRelease("C" + + Math.floor(7*Math.random()), "8n");
})

socket.on('error', function(errorMsg){
    alert(errorMsg)
})



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
            socket.emit('noteTest');
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


playBTN.addEventListener("click", ()=>{
    if(Tone.context.state != "running")
        Tone.start();

    socket.emit('noteTest')
    console.log(Player.list)
    // synth.triggerAttackRelease("C3", "8n");
})