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