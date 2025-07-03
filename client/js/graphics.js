import { Player, Bullet, Pickup } from './classes.js'
import { selfId } from './main.js'


let gameWidth = window.innerWidth;
let gameHeight = window.innerHeight;

export var canvas = document.getElementById("ctx");
canvas.tabIndex = 1000; //so I can listen to events on canvas specifically
var ctx = canvas.getContext("2d");

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

//game Loop:
export function gameLoop(){
    // console.log(Player.list)
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, gameWidth, gameHeight);
    drawMap()

    ctx.fillStyle = "black";
    for(var i in Pickup.list){
        let x = Pickup.list[i].x - Player.list[selfId].x + gameWidth/2;
        let y = Pickup.list[i].y - Player.list[selfId].y + gameHeight/2;

        ctx.fillRect(x-15, y-15, 30, 30);
    }


    
    for(var i in Player.list){
        ctx.textAlign = "center";


        let x = Player.list[i].x - Player.list[selfId].x + gameWidth/2;
        let y = Player.list[i].y - Player.list[selfId].y + gameHeight/2;

        if(Player.list[i].id == selfId){
            //hp bar:
            ctx.fillStyle = "grey";
            ctx.fillRect(20, 20, 100, 16)
            ctx.fillStyle = "red";
            ctx.fillRect(20, 20, (Player.list[i].hp/100)*100, 16)
            ctx.fillStyle = "black";
            ctx.font = 'bold 18px Cascadia Mono';
            ctx.fillText(Player.list[i].hp, 70, 35);

            // ctx.filter = "hue-rotate(180deg)"
            ctx.font = 'bold 20px Cascadia Mono';
        }
        else{
            //hp bar:
            ctx.fillStyle = "grey";
            ctx.fillRect(x-25, y-58, 50, 8)
            ctx.fillStyle = "red";
            ctx.fillRect(x-25, y-58, (Player.list[i].hp/100)*50, 8)
            ctx.fillStyle = "black";
            ctx.font = '12px Cascadia Mono';
            ctx.fillText(Player.list[i].hp, x, y-50);

            ctx.filter = "none";
            ctx.font = '16px Cascadia Mono';
        }    
        ctx.drawImage(Img.player, x-32, y-32);
        ctx.fillText(Player.list[i].name, x, y-32);
    };

    for(var i in Bullet.list){
        let x = Bullet.list[i].x - Player.list[selfId].x + gameWidth/2;
        let y = Bullet.list[i].y - Player.list[selfId].y + gameHeight/2;

        ctx.fillRect(x-5, y-5, 10, 10);
    }
    requestAnimationFrame(gameLoop)
}