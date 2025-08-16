function screenToIso(x, y){
    return{
        x: (2*y + x)/2,
        y: (2*y - x)/2
    }
}

export class Tile{
    static list = {};
    static W = 64;
    static H = 32;

    constructor(gid, ortX, ortY, layerId){
        this.gid = gid;
        this.ortX = ortX;
        this.ortY = ortY;
        this.layerId = layerId;

        let scr = screenToIso(this.ortX, this.ortY)

        this.x = scr.x;
        this.y = scr.y;

        this.width = 32;
        this.height = 32;

        this.id = Math.random();
        Tile.list[this.id] = this;
    }
}