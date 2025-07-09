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


const Img = {};
let drawBuffer = [];

Img.player = new Image();
Img.player.src = "../img/placeholder.png"

Img.note = {}

Img.note['1n'] = new Image();
Img.note['1n'].src = "../img/note.png"
Img.note['2n'] = new Image();
Img.note['2n'].src = "../img/halfnote.png"
Img.note['4n'] = new Image();
Img.note['4n'].src = "../img/quarternote.png"
Img.note['8n'] = new Image();
Img.note['8n'].src = "../img/eightnote.png"

Img.pickup = new Image();
Img.pickup.src = "../img/tileset/blocks_101.png"

Img.map = new Image();
Img.map.src = "../img/map.png"

console.log(Img)

let mapData;
let collisionLayer;
let tileImages;

//get map data:
fetch("../img/map.json")
    .then(res=>res.json())
    .then(async data=>{
        mapData = data;
        console.log(data)

        console.log(getUsedGIDs(mapData))
        console.log(loadUsedTiles(mapData));

        tileImages = await loadUsedTiles(mapData)
        collisionLayer = getCollisionLayer(mapData)
        console.log(collisionLayer)
    });

function getUsedGIDs(mapData){
    const gids = new Set();
    for(const layer of mapData.layers){
        if(layer.type !== "tilelayer") continue;

        for(const chunk of layer.chunks){

            for(const tileID of chunk.data){
                if(tileID !== 0) gids.add(tileID)
            }
        }
    }
    return gids;
}

function getCollisionLayer(mapData){
    for(const layer of mapData.layers){
        if(layer.name == 'collision') return layer;
    }
    return null;
}

async function loadUsedTiles(mapData){
    const usedGIDs = getUsedGIDs(mapData);

    const tileset = mapData.tilesets[0];
    const tileImages = {};

    for(const tile of tileset.tiles){
        const globalID = tile.id + tileset.firstgid;

        if(!usedGIDs.has(globalID)) continue;

        const img = new Image();
        img.src = `../img/${tile.image}`;

        await new Promise(res => (img.onload = res));
        tileImages[globalID] = img;
    }

    return tileImages;
}

function isoToScreen(x, y){
    return{
        x: (x-y),
        y: (x+y)/2
    }
}

function drawIsometricRect(tileX, tileY, width, height){
    ctx.save()

    const tileW = 64;
    const tileH = 32;

    let tilesNWtoSE = width/32;
    let tilesNEtoSW = height/32;

    let worldCoord = isoToScreen(tileX, tileY)

    let x = worldCoord.x + gameWidth/2  + 3531 - Player.list[selfId].x
    
    let y = worldCoord.y + gameHeight/2 + 0 - Player.list[selfId].y

    ctx.strokeStyle = "red";


    ctx.beginPath();
    ctx.moveTo(x, y);                     // top

    ctx.lineTo(x + tilesNWtoSE*tileW/2, y + tilesNWtoSE*tileH/2);     // right

    ctx.lineTo(x + (tilesNWtoSE - tilesNEtoSW)*tileW/2, y + (tilesNWtoSE + tilesNEtoSW)*tileH/2);            // bottom

    ctx.lineTo(x - tilesNEtoSW*tileW/2, y + tilesNEtoSW*tileH/2);     // left
    
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
}

function drawMap(){
    if(Player.list[selfId]){
        let bx = gameWidth/2 - Player.list[selfId].x;
        let by = gameHeight/2 - Player.list[selfId].y;
        ctx.drawImage(Img.map, bx - 564, by -256) //weird shift TO FIX

        if(mapData && tileImages){
            for(const layer of mapData.layers){
                if(layer.type !== "tilelayer" || layer.visible == false) continue;

                //get layer height:
                //from "wall1" to 0, from "wall2" to 1, etc.
                let match = layer.name.match(/\d+$/);
                let layerId = match ? parseInt(match[0], 10)-1 : null;

                for(const chunk of layer.chunks){
                    const width = chunk.width;
                    const height = chunk.height;
                    const tileW = 64;
                    const tileH = 32;
                    const offsetX = layer.offsetx || 0;
                    const offsetY = layer.offsety || 0;
                    for (let y = 0; y < height; y++) {
                        for (let x = 0; x < width; x++) {
                            const index = y * width + x;
                            const gid = chunk.data[index];
                            if (!gid || !tileImages[gid]) continue;

                            const img = tileImages[gid];

                            // position:
                            const tileX = chunk.x + x;
                            const tileY = chunk.y + y;


                            //this code above ^^^ should be done once & not for each frame
                            const screenX = (tileX - tileY) * tileW / 2 + gameWidth/2 + 3500 + offsetX - Player.list[selfId].x; //weird shift TO FIX
                            const screenY = (tileX + tileY) * tileH / 2 + gameHeight/2 + offsetY - img.height + tileH  - Player.list[selfId].y;

                            drawBuffer.push({
                                img: img,
                                x: screenX,
                                y: screenY,
                                layerId: layerId,
                                w: 64,
                                h: 64
                            })
                        }
                    }
                }
            }
        }
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

        // ctx.drawImage(Img.pickup, x-16, y-16, 32, 32);
        drawBuffer.push({
            img: Img.pickup,
            x: x-8,
            y: y-8,
            w: 16,
            h: 16
        })
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
        drawBuffer.push({
            img: Img.player,
            x: x-32,
            y: y-32,
            w: 64,
            h: 64,
        })
        ctx.fillText(Player.list[i].name, x, y-32);
    };

    for(var i in Bullet.list){
        let bullet = Bullet.list[i]
        let x = bullet.x - Player.list[selfId].x + gameWidth/2;
        let y = bullet.y - Player.list[selfId].y + gameHeight/2;

        drawBuffer.push({
            img: Img.note[bullet.duration],
            x: x-16,
            y: y-16,
            w: 32,
            h: 32,
        })
    }

    //sort and draw drawBuffer:
    drawBuffer.sort((a, b) => {
        let aY = a.y;
        let bY = b.y;

        if(a.layerId){
            aY = aY + 32*a.layerId
        }
        if(b.layerId){
            bY = bY + 32*b.layerId
        }
            return aY - bY
    })

    for(let obj of drawBuffer){
        ctx.drawImage(obj.img, obj.x, obj.y, obj.w, obj.h);
    }
    drawBuffer = []




    //draw collision rectangles (for debug):
    // if(collisionLayer){
    //     for(let obj of collisionLayer.objects){
    //         drawIsometricRect(obj.x, obj.y, obj.width, obj. height)
    //     }
    // }

    requestAnimationFrame(gameLoop)
}