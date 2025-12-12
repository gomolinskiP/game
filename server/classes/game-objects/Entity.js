import { sqrt } from "@tensorflow/tfjs";
import { Tile } from "./Tile.js";

export class Entity {
    static list = {};

    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    findNearest(objList, quadtree, maxDistance) {
        let nearest = null;
        let minDistSq = maxDistance * maxDistance;

        const nearestCandidates = quadtree.retrieve({
            x: this.x - maxDistance,
            y: this.y - maxDistance,
            width: maxDistance * 2,
            height: maxDistance * 2,
        });

        if (nearestCandidates.length == 0) return null;
        for (let candidate of nearestCandidates) {
            let other = objList[candidate.id];
            if (!other) continue;
            if (other === this) continue;
            // if(other.id == this.parent?.id) continue;
            if (other.isDead) continue;
            if(!other.isPlaying) continue;

            const distSq = this.getDistSq(other);

            if (distSq < minDistSq) {
                minDistSq = distSq;
                nearest = other;
            }
        }

        return nearest;
    }

    getDxDy(other) {
        const dx = this.x - other.x,
            dy = (this.y - other.y) * 2;

        return { dx, dy };
    }

    getDistSq(other) {
        const { dx, dy } = this.getDxDy(other);

        return dx * dx + dy * dy;
    }

    getDist(other) {
        const distSq = this.getDistSq(other);

        return Math.sqrt(distSq);
    }

    isColliding(other) {
        //legacy code TOFIX TODO
        return this.isWithinDistance(other, Math.sqrt(500));
    }

    isWithinDistance(other, maxDistance) {
        if (!other) return false;
        const distSq = this.getDistSq(other);

        if (distSq < maxDistance * maxDistance) return true;
        else return false;
    }

    collidingPlayerId(characterList, characterQTree) {
        const collCandidates = characterQTree.retrieve({
            x: this.x - 100,
            y: this.y - 100,
            width: 200,
            height: 200,
        });

        if (collCandidates.length == 0) return null;
        for (let candidate of collCandidates) {
            if (this.isColliding(characterList[candidate.id])) {
                return candidate.id;
            }
        }

        return null;
    }

    isInNonPVPArea() {
        if (
            Tile.checkTilesCollision(this.x, this.y, Tile.noPVPfloorQTree) ||
            (Math.abs(this.x) < 400 && Math.abs(this.y) < 400)
        ) {
            return true;
        } else return false;
    }

    static isInNonPVPArea(x, y) {
        if (
            Tile.checkTilesCollision(x, y, Tile.noPVPfloorQTree) ||
            (Math.abs(x) < 400 && Math.abs(y) < 400)
        ) {
            return true;
        } else return false;
    }
}