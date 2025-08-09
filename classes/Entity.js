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
            x: this.x - 300,
            y: this.y - 300,
            width: 600,
            height: 600,
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

        // for(let i in objList){
        //     let other = objList[i];

        //     if(other === this) continue;

        //     const dx = this.x - other.x;
        //     const dy = this.y - other.y;
        //     const distSq = dx*dx + dy*dy;

        //     if(distSq < minDistSq){
        //         minDistSq = distSq;
        //         nearest = other;
        //     }
        // }

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

        // for(let i in playerList){
        //     let targetPlayer = playerList[i];
        //     if(this.isColliding(targetPlayer)){
        //         return targetPlayer.id;
        //     }
        // }
        return null;
    }
}