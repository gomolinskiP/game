import { Graphics } from "../graphics.js";
import { Socket } from "../clientSocket.js";
import { Player } from "./C_Character.js";

const selfId = Socket.selfId;

export class StaticTileLayers {
    //TODO all floor & below layers could be rendered at once?

    static canvases = {};

    static tileBuffers = {};

    static addToBuffer(tile) {
        const layerID = tile.layerId;

        if (!this.tileBuffers[layerID]) {
            this.tileBuffers[layerID] = [];

            setInterval(() => {
                if (
                    this.tileBuffers[layerID] &&
                    this.tileBuffers[layerID].length == 0
                )
                    return;

                this.build(layerID, Object.values(Tile.list));
            }, 2000);
        }

        this.tileBuffers[layerID].push(tile);

        if (this.tileBuffers[layerID].length > 120) {
            console.log("build!");
            this.build(layerID, Object.values(Tile.list));
        }

        // console.log(this.tileBuffers[layerID]);

        // console.log(
        //     "layerID",
        //     layerID,
        //     "bufferLen",
        //     this.tileBuffers[layerID].length,
        //     "buffer",
        //     this.tileBuffers[layerID]
        // );
    }

    static build(layerID, tiles) {
        // if (!tileImages) return;
        if (
            this.canvases[layerID] &&
            this.canvases[layerID].hasOwnProperty("timeStamp") &&
            Date.now() - this.canvases[layerID].timeStamp < 1000
        )
            return;
        // if(Date.now() - this.canvases[layerID].timeStamp < 1000) return;

        this.tileBuffers[layerID] = [];

        const minX = Math.min(...tiles.map((t) => t.x));
        const minY = Math.min(...tiles.map((t) => t.y));
        const maxX = Math.max(...tiles.map((t) => t.x));
        const maxY = Math.max(...tiles.map((t) => t.y));

        const width = (maxX - minX + 64) * 0.5;
        const height = (maxY - minY + 64) * 0.5;

        const buffer = new OffscreenCanvas(width, height);
        const bctx = buffer.getContext("2d");
        bctx.scale(0.5, 0.5);
        //SCALE 0.1 also in graphics.js:301&:302

        let yBuffer = [];
        for (const t of tiles) {
            if (t.layerId !== layerID) continue;
            yBuffer.push(t);
        }

        yBuffer.sort((a, b) => {
            let aY = a.y;
            let bY = b.y;

            return aY - bY - 0.01;
        });

        for (const t of yBuffer) {
            const img = Tile.tileImages[t.gid];
            if (!img) {
                //image tile not loaded yet:
                Tile.loadImg(t.gid);
                continue;
            }
            bctx.drawImage(img, t.x - minX, t.y - minY, 64, 64);
        }

        const timeStamp = Date.now();
        this.canvases[layerID] = {
            buffer,
            minX,
            minY,
            width,
            height,
            timeStamp,
        };
        // console.log('built layer canvas')
    }
}

export class Tile {
    static list = {};

    static mapData;
    static tileImages = {};
    static currentLoadingGIDs = {};

    static loadMapData() {
        fetch("../map6.json")
            .then((res) => res.json())
            .then(async (data) => {
                Tile.mapData = data;
            });
    }

    static async loadImg(gid) {
        if (!Tile.mapData) return;
        if (Tile.currentLoadingGIDs[gid]) return;
        Tile.currentLoadingGIDs[gid] = true;

        const tileset = Tile.mapData.tilesets[0];
        const id = gid - tileset.firstgid;
        const tile = tileset.tiles.find((t) => t.id === id);

        const img = new Image();
        img.src = `../${tile.image}`;
        await new Promise((res) => (img.onload = res));
        Tile.tileImages[gid] = img;
    }

    constructor(id, initPack) {
        this.id = id;
        this.x = initPack.x;
        this.y = initPack.y;
        this.gid = initPack.gid;
        this.layerId = initPack.layerId;
        // console.log('layerid', this.layerId)
        if (this.layerId <= 0) {
            StaticTileLayers.addToBuffer(this);
            // buildStaticLayer(this.layerId, Object.values(Tile.list));
        }

        Tile.list[this.id] = this;
    }

    draw() {
        // if(!tileImages) return;
        const img = Tile.tileImages[this.gid];
        if (!img) {
            //image tile not loaded yet:
            Tile.loadImg(this.gid);
            return;
        }

        if (this.layerId <= 0) return;
        let x = this.x - Player.list[selfId].x + Graphics.gameWidth / 2;
        let y = this.y - Player.list[selfId].y + Graphics.gameHeight / 2;
        // const img = tileImages[this.gid];

        let shiftSortY;
        if (this.layerId > 0) {
            shiftSortY = 48 + 33 * (this.layerId - 1);
        } else {
            shiftSortY = 64 * this.layerId;
        }

        if (!img) console.error("no img", this.gid);
        // else console.log(this.gid)

        Graphics.drawBuffer.push({
            type: "image",
            img: img,
            x: x,
            y: y,
            sortY: y + shiftSortY,
            layerId: this.layerId,
            w: 64,
            h: 64,
        });
    }

    destroy() {
        // super.destroy();
        delete Tile.list[this.id];
    }
}
