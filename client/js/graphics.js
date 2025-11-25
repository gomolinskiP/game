import { Player, Bullet, Pickup, Tile,  StaticTileLayers } from './classes.js'
import { Socket } from './clientSocket.js';


export class Graphics {
    static Img = {};
    static drawBuffer = [];
    static gameMessages = [];

    static canvas;
    static ctx;

    static gameWidth = window.innerWidth;
    static gameHeight = window.innerHeight;

    static canvasInit() {
        Graphics.canvas = document.getElementById("ctx");
        Graphics.tabIndex = 1000; //so I can listen to events on canvas specifically
        Graphics.ctx = Graphics.canvas.getContext("2d");
    }

    static canvasResize() {
        Graphics.gameWidth = window.innerWidth / Graphics.gameZoom;
        Graphics.gameHeight = window.innerHeight / Graphics.gameZoom;
        Graphics.canvas.style.scale = Graphics.gameZoom;
        Graphics.canvas.width = Graphics.gameWidth;
        Graphics.canvas.height = Graphics.gameHeight;
    }

    static gameZoom = 0.5;
    static changeZoomLevel(dir) {
        if (dir == "up" && Graphics.gameZoom < 1) {
            Graphics.gameZoom += 0.01;
            Graphics.canvasResize();
        } else if (dir == "down" && Graphics.gameZoom > 0.2) {
            Graphics.gameZoom -= 0.01;
            Graphics.canvasResize();
        }
        // console.log(Graphics.gameZoom)
    }

    static loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = (err) => reject(err);
            img.src = src;
        });
    }

    static loadImages() {
        Graphics.Img.player = new Image();
        Graphics.Img.player.src = "../img/char/s1.png";

        let directions = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];
        Graphics.Img.playerAnim = {};
        for (let dir of directions) {
            Graphics.Img.playerAnim[dir] = {};

            for (let i = 0; i < 3; i++) {
                Graphics.Img.playerAnim[dir][i] = new Image();
                Graphics.Img.playerAnim[dir][i].src = `../img/char/${dir}${
                    i + 1
                }.png`;
            }
        }
        Graphics.Img.botAnim = {};
        for (let dir of directions) {
            Graphics.Img.botAnim[dir] = {};

            for (let i = 0; i < 3; i++) {
                Graphics.Img.botAnim[dir][i] = new Image();
                Graphics.Img.botAnim[dir][i].src = `../img/bot/${dir}${
                    i + 1
                }.png`;
            }
        }

        Graphics.Img.note = {};

        Graphics.Img.note["1n"] = new Image();
        Graphics.Img.note["1n"].src = "../img/note.png";
        Graphics.Img.note["2n"] = new Image();
        Graphics.Img.note["2n"].src = "../img/halfnote.png";
        Graphics.Img.note["4n"] = new Image();
        Graphics.Img.note["4n"].src = "../img/quarternote.png";
        Graphics.Img.note["8n"] = new Image();
        Graphics.Img.note["8n"].src = "../img/eightnote.png";

        Graphics.Img.note["1n."] = new Image();
        Graphics.Img.note["1n."].src = "../img/note.png";
        Graphics.Img.note["2n."] = new Image();
        Graphics.Img.note["2n."].src = "../img/halfnote.png";
        Graphics.Img.note["4n."] = new Image();
        Graphics.Img.note["4n."].src = "../img/quarternote.png";
        Graphics.Img.note["8n."] = new Image();
        Graphics.Img.note["8n."].src = "../img/eightnote.png";

        Graphics.Img.pickup = new Image();
        Graphics.Img.pickup.src = "../img/tileset/blocks_101.png";

        Graphics.Img.fog = new Image();
        Graphics.Img.fog.src = "../img/fog.png";
    }

    static drawMap() {
        if (!Socket.selfId) return;
        if (!Player.list[Socket.selfId]) return;

        for (let layerId in StaticTileLayers.canvases) {
            const layer = StaticTileLayers.canvases[layerId];
            // console.log(layer.width, layer.height)
            // console.log('layer', layer)
            Graphics.ctx.drawImage(
                layer.buffer,
                layer.minX -
                    Player.list[Socket.selfId].x +
                    Graphics.gameWidth / 2,
                layer.minY -
                    Player.list[Socket.selfId].y +
                    Graphics.gameHeight / 2,
                layer.width / 0.1,
                layer.height / 0.1
            );
        }

        if (Player.list[Socket.selfId]) {
            for (let i in Tile.list) {
                const tile = Tile.list[i];
                tile.draw();
            }
        }
    }

    static gameLoop() {
        if (!fogLayer) {
            requestAnimationFrame(Graphics.gameLoop);
            return;
        }
        const startT = performance.now();
        if (!Socket.selfId) {
            Socket.selfId = Socket.Socket.selfId;
        }
        // console.log(Player.list[Socket.selfId].x, Player.list[Socket.selfId].y);

        //draw background & map elements:
        Graphics.ctx.fillStyle = "black";
        Graphics.ctx.fillRect(0, 0, Graphics.gameWidth, Graphics.gameHeight);
        Graphics.ctx.drawImage(fogLayer, fog1.x, fog1.y);

        Graphics.drawMap();

        // Graphics.ctx.drawImage(fogLayer, fog2.x, fog2.y);

        //draw game objects:
        for (var i in Pickup.list) {
            if (!Pickup.list[i]) continue;
            Pickup.list[i].draw();
        }
        for (var i in Player.list) {
            Player.list[i].draw();
        }

        for (var i in Bullet.list) {
            Bullet.list[i].draw();
        }

        //sort and draw drawBuffer:
        Graphics.drawBuffer.sort((a, b) => {
            let aY = a.sortY;
            let bY = b.sortY;

            // if(a.layerId){
            //     aY = aY + (64)*a.layerId
            // }
            // if(b.layerId){
            //     bY = bY + (64)*b.layerId
            // }
            return aY - bY - 0.01;
        });

        for (let obj of Graphics.drawBuffer) {
            switch (obj.type) {
                case "image":
                    Graphics.ctx.imageSmoothingEnabled = false;
                    if (obj.hueRot) {
                        // Graphics.ctx.filter = `hue-rotate(${obj.hueRot}deg)`;
                    }
                    if (obj.img)
                        Graphics.ctx.drawImage(
                            obj.img,
                            obj.x,
                            obj.y,
                            obj.w,
                            obj.h
                        );
                    // Graphics.ctx.filter = 'none';
                    // Graphics.ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
                    // if(obj.layerId>0) Graphics.ctx.fillRect(obj.x,obj.sortY,3,3);
                    break;
                case "text":
                    Graphics.ctx.textAlign = "center";
                    Graphics.ctx.fillStyle = obj.color ? obj.color : "black";
                    Graphics.ctx.font = obj.font;
                    Graphics.ctx.fillText(obj.text, obj.x, obj.y);
                    break;
                case "hpbar":
                    Graphics.ctx.textAlign = "center";
                    //hp bar:
                    Graphics.ctx.fillStyle = "grey";
                    Graphics.ctx.fillRect(obj.x - 25, obj.y - 58, 50, 8);
                    Graphics.ctx.fillStyle = "red";
                    Graphics.ctx.fillRect(
                        obj.x - 25,
                        obj.y - 58,
                        (obj.hp / 1000) * 50,
                        8
                    );
                    Graphics.ctx.fillStyle = "black";
                    Graphics.ctx.font = "12px Cascadia Mono";
                    Graphics.ctx.fillText(Math.ceil(obj.hp), obj.x, obj.y - 50);
            }
        }
        Graphics.drawBuffer = [];

        Graphics.ctx.drawImage(fogLayer, fog3.x, fog3.y);

        Graphics.updateFog(1, 0.4);

        for (const msg of Graphics.gameMessages) {
            Graphics.ctx.fillStyle = msg.color;
            Graphics.ctx.font = "bold " + msg.fontSize + "px Cascadia Mono";
            Graphics.ctx.strokeStyle = "black";
            Graphics.ctx.lineWidth = Math.max(1, msg.fontSize - 24);
            Graphics.ctx.strokeText(msg.text, msg.x, msg.y);
            Graphics.ctx.fillText(msg.text, msg.x, msg.y);

            msg.y -= 1;
            if (msg.fontSize > 2) msg.fontSize -= 0.05;
        }
        // drawHUD();

        // draw agent environment grid:
        // for(const id in Player.list){
        //     if(id != Socket.selfId) continue;
        //     const player = Player.list[id];

        //     drawAgentGrid(player);
        // }

        const endT = performance.now();
        // console.log("frameT", endT - startT);
        requestAnimationFrame(Graphics.gameLoop);
    }

    static addGameMsg(msg, rating) {
        if (Graphics.gameMessages.length > 0) Graphics.gameMessages.shift();

        let msgColor;
        switch (rating) {
            case "good":
                msgColor = "green";
                break;
            case "ok":
                msgColor = "darkyellow";
                break;
            case "bad":
                msgColor = "red";
                break;
            default:
                console.log("unknown shoot feedback message rating: " + rating);
        }

        Graphics.gameMessages.push({
            text: msg,
            color: msgColor,
            fontSize: 26,
            x:
                Graphics.gameWidth / 2 +
                ((Math.random() - 0.5) * Graphics.gameWidth) / 4,
            y: Graphics.gameHeight / 2 - 32,
        });

        setTimeout(() => {
            Graphics.gameMessages.shift();
        }, 10000);
    }

    static createFogLayer() {
        const width = Graphics.gameWidth * 3;
        const height = Graphics.gameHeight * 3;

        const layer = document.createElement("canvas");
        layer.width = width;
        layer.height = height;
        const lctx = layer.getContext("2d");
        lctx.globalAlpha = 0.4;

        const img = Graphics.Img.fog;
        const imgWidth = img.width;
        const imgHeight = img.height;

        console.log(img);

        const repX = Math.ceil(width / imgWidth);
        const repY = Math.ceil(height / imgHeight);

        for (let i = 0; i < repX; i++) {
            for (let j = 0; j < repY; j++) {
                lctx.drawImage(img, i * imgWidth, j * imgHeight);
            }
        }

        return layer;
    }

    static updateFog(dx, dy) {
        fog1.x -= 0.5 * dx;
        fog1.y -= 1 * dy;
        if (fog1.x < -Graphics.gameWidth) {
            fog1.x += Graphics.Img.fog.width;
        }
        if (fog1.y < -Graphics.gameHeight) {
            fog1.y += Graphics.Img.fog.height;
        }

        fog2.x -= 2 * dx;
        fog2.y -= 2 * dy;
        if (fog2.x < -Graphics.gameWidth) {
            fog2.x += Graphics.gameWidth;
        }
        if (fog2.y < -Graphics.gameHeight) {
            fog2.y += Graphics.gameHeight;
        }

        fog3.x -= 3 * dx;
        fog3.y -= 3 * dy;
        if (fog3.x < -Graphics.gameWidth) {
            fog3.x += Graphics.Img.fog.width;
        }
        if (fog3.y < -Graphics.gameHeight) {
            fog3.y += Graphics.Img.fog.height;
        }
    }
}

Graphics.canvasInit();
Graphics.canvasResize();
window.addEventListener("resize", Graphics.canvasResize);
Graphics.loadImages();

function drawAgentGrid(player){
    if(!Socket.selfId) return;
    const x = player.x - Player.list[Socket.selfId].x + Graphics.gameWidth / 2;
    const y = player.y - Player.list[Socket.selfId].y + Graphics.gameHeight / 2;

    let gridDims = 3;
    let cellH = 400;
    let cellW = 800;

    for(let i = 0; i < gridDims; i++){
        for(let j = 0; j < gridDims; j++){
            const cellX = x - gridDims*cellW/2 + j*cellW;
            const cellY = y - gridDims*cellH/2 + i*cellH;


            Graphics.ctx.fillStyle = `#${(3*i)%9}000${(3*j)%9}044`;
            for (let id in Bullet.list) {
                const pickup = Bullet.list[id];
                const px = pickup.x - Player.list[Socket.selfId].x + Graphics.gameWidth / 2;
                const py = pickup.y - Player.list[Socket.selfId].y + Graphics.gameHeight / 2;
                if (
                    px > cellX &&
                    px < cellX + cellW &&
                    py > cellY &&
                    py < cellY + cellH
                ) {
                    Graphics.ctx.fillStyle = `#00ff0044`;
                }
            }
            Graphics.ctx.fillRect(cellX, cellY, cellW, cellH);
            // Graphics.ctx.stroke();
        }
    }

    cellH = cellH/3;
    cellW = cellW/3;

    for (let i = 0; i < gridDims; i++) {
        for (let j = 0; j < gridDims; j++) {
            const cellX = x - (gridDims * cellW) / 2 + j * cellW;
            const cellY = y - (gridDims * cellH) / 2 + i * cellH;

            Graphics.ctx.fillStyle = `#${(3 * i) % 9}000${(3 * j) % 9}044`;
            for (let id in Bullet.list) {
                const pickup = Bullet.list[id];
                const px = pickup.x - Player.list[Socket.selfId].x + Graphics.gameWidth / 2;
                const py = pickup.y - Player.list[Socket.selfId].y + Graphics.gameHeight / 2;
                if (
                    px > cellX &&
                    px < cellX + cellW &&
                    py > cellY &&
                    py < cellY + cellH
                ) {
                    Graphics.ctx.fillStyle = `#00ff0044`;
                }
            }
            Graphics.ctx.fillRect(cellX, cellY, cellW, cellH);
            // Graphics.ctx.stroke();
        }
    }

    cellH = cellH / 3;
    cellW = cellW / 3;

    for (let i = 0; i < gridDims; i++) {
        for (let j = 0; j < gridDims; j++) {
            const cellX = x - (gridDims * cellW) / 2 + j * cellW;
            const cellY = y - (gridDims * cellH) / 2 + i * cellH;

            Graphics.ctx.fillStyle = `#${(3 * i) % 9}000${(3 * j) % 9}044`;
            for (let id in Bullet.list) {
                const pickup = Bullet.list[id];
                const px = pickup.x - Player.list[Socket.selfId].x + Graphics.gameWidth / 2;
                const py = pickup.y - Player.list[Socket.selfId].y + Graphics.gameHeight / 2;
                if (
                    px > cellX &&
                    px < cellX + cellW &&
                    py > cellY &&
                    py < cellY + cellH
                ) {
                    Graphics.ctx.fillStyle = `#00ff0044`;
                }
            }
            Graphics.ctx.fillRect(cellX, cellY, cellW, cellH);
            // Graphics.ctx.stroke();
        }
    }

    cellH = cellH / 3;
    cellW = cellW / 3;

    for (let i = 0; i < gridDims; i++) {
        for (let j = 0; j < gridDims; j++) {
            const cellX = x - (gridDims * cellW) / 2 + j * cellW;
            const cellY = y - (gridDims * cellH) / 2 + i * cellH;

            Graphics.ctx.fillStyle = `#${(3 * i) % 9}000${(3 * j) % 9}044`;
            for (let id in Bullet.list) {
                const pickup = Bullet.list[id];
                const px = pickup.x - Player.list[Socket.selfId].x + Graphics.gameWidth / 2;
                const py = pickup.y - Player.list[Socket.selfId].y + Graphics.gameHeight / 2;
                if (
                    px > cellX &&
                    px < cellX + cellW &&
                    py > cellY &&
                    py < cellY + cellH
                ) {
                    Graphics.ctx.fillStyle = `#00ff0044`;
                }
            }
            Graphics.ctx.fillRect(cellX, cellY, cellW, cellH);
            // Graphics.ctx.stroke();
        }
    }
}

let fog1 = {
    x: 0,
    y: 0,
}

let fog2 = {
    x: 0,
    y: 0,
};

let fog3 = {
    x: 0,
    y: 0,
};

let fogLayer;
let fogLoaded = false;
Graphics.Img.fog.onload = () => {
    fogLayer = Graphics.createFogLayer();
    fogLoaded = true;
}
