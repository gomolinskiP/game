import Quadtree from '@timohausmann/quadtree-js';
// import { mapBoundRect } from '../socket.js';

function screenToIso(x, y){
    return{
        x: (2*y + x)/2,
        y: (2*y - x)/2
    }
}

function isoToScreen(x, y){
    return{
        x: (x-y),
        y: (x+y)/2
    }
}

export class Tile{
    static list = {};
    static mapBoundRect;
    // static qTree = new Quadtree(mapBoundRect);
    static W = 64;
    static H = 32;


    constructor(gid, ortX, ortY, layerId){
        this.gid = gid;
        this.x = ortX;
        this.y = ortY;
        this.layerId = layerId;

        let scr = screenToIso(this.x, this.y)

        // this.x = scr.x;
        // this.y = scr.y;

        this.isoX = scr.x;
        this.isoY = scr.y;

        this.width = 32;
        this.height = 32;

        this.id = Math.random();
        Tile.list[this.id] = this;
        // Tile.qTree.insert({
        //     x: this.ortX,
        //     y: this.ortY,
        //     width: 64,
        //     height: 64,
        //     id: this.id,
        // })
    }
}