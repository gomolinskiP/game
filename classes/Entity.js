import { characterQTree } from "../socket.js";

export class Entity{
    static list = {};

    constructor(x, y){
        this.x = x;
        this.y = y;
    }

    findNearest(objList, quadtree, maxDistance){
        let nearest = null;
        let minDistSq = maxDistance * maxDistance;

        const nearestCandidates = quadtree.retrieve({
            x: this.x - maxDistance,
            y: this.y - maxDistance,
            width: maxDistance*2,
            height: maxDistance*2,
        })

        if(nearestCandidates.length == 0) return null;
        for(let candidate of nearestCandidates){
            let other = objList[candidate.id];
            if(!other) continue;
            if(other === this) continue;

            const dx = this.x - other.x;
            const dy = this.y - other.y;
            const distSq = dx*dx + dy*dy;

            if(distSq < minDistSq){
                minDistSq = distSq;
                nearest = other;
            }
        }

        return nearest;
    }

    isColliding(other){
        let dx = this.x - other.x;
        let dy = this.y - other.y;
        let distSq = dx*dx + dy*dy;

        if(distSq < 500) return true;
        else return false;
    }

    collidingPlayerId(playerList){
        const collCandidates = characterQTree.retrieve({
            x: this.x - 100,
            y: this.y - 100,
            width: 200,
            height: 200
        });

        if(collCandidates.length == 0) return null;
        for(let candidate of collCandidates){
            if(this.isColliding(playerList[candidate.id])){
                return candidate.id;
            }
        }

        return null;
    }
}