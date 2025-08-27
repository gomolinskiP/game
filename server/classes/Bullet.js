import { Entity } from './Entity.js';
import { Player } from './Player.js';
import {bulletQTree, characterQTree, scale, wallQTree, checkTilesCollision, startT, tick2, beatInterval} from '../socket.js'
import { Character } from './Character.js';


export class ScheduledBullet{
    static list = {};

    constructor(parent, note = 'onSpawn', durationType, damage){
        this.id = Math.random();
        this.parent = parent;
        this.x = parent.x;
        this.y = parent.y;

        this.sound = parent.weapon.sound;
        this.duration = parent.weapon.duration;
        this.durationType = durationType;
        this.damage = damage;
        this.note = note;
        this.spawnInT = this.getSpawnTime();
        this.durationInMs = this.getTimeFromDuration(this.duration, this.durationType)
        this.maxTimeInaccuracy = Math.max(100, this.durationInMs / 10);

        console.log(this.spawnInT, this.duration, this.durationInMs)
        if(this.spawnInT > this.durationInMs - this.maxTimeInaccuracy){
            //player is late by no more than 200ms TOFIX 1800 is good only for whole notes
            this.spawn();
            setTimeout(()=>{
                this.parent.hasShotScheduled = false;
            }, this.durationInMs - this.maxTimeInaccuracy)
            
        }
        else if(this.spawnInT > this.maxTimeInaccuracy){
            //player is too early;
            this.cancel();
        }
        else{
            //player early but within max inaccuracy:
            setTimeout(()=>{
                this.spawn();
            }, this.spawnInT)

            setTimeout(()=>{
                this.parent.hasShotScheduled = false;
            }, this.durationInMs - this.maxTimeInaccuracy)
        }

        ScheduledBullet.list[this.id] = this;
        return this;
    }

    updatePosition(x, y){
        this.x = x;
        this.y = y;
    }

    cancel(){
        let message;
        if(this.spawnInT < this.durationInMs/2){
            message = "To early!"
        }
        else{
            message = "To late!"
        }

        if(this.parent.updatePack){
            this.parent.updatePack.push({
                msg: message,
                type: "gameMsg"
            })
        }
        setTimeout(()=>{
                this.parent.hasShotScheduled = false;
        }, this.spawnInT)
    }

    spawn(){
        new Bullet(this.parent, this.parent.lastAngle, this.note, this.durationType, this.damage);
        this.destroy();
    }

    getSpawnTime(){
        const creationTimeNs = process.hrtime.bigint() - startT;
        const lastTickT = (tick2 - 1) * beatInterval; //in ms
        const timeDif = Number(creationTimeNs/BigInt(1e6)) - lastTickT;

        let spawnInT;
        switch(this.duration){
            case "1n":
                spawnInT = (4 - (tick2 -1)%4) * beatInterval - timeDif;
                break;
            case "2n":
                spawnInT = (2 - (tick2 -1)%2) * beatInterval - timeDif;
                break;
            case "4n":
                spawnInT = beatInterval - timeDif;
                break;
            case "8n":
                if(timeDif > beatInterval/2){
                    spawnInT = beatInterval - timeDif;
                }
                else{
                    spawnInT = beatInterval/2 - timeDif;
                }
                break;
            case "1n.":
                spawnInT = (6 - (tick2 -1)%6) * beatInterval - timeDif;
                break;
            case "2n.":
                spawnInT = (3 - (tick2 -1)%3) * beatInterval - timeDif;
                break;
            case "4n.":
                let quarterInCycle = (tick2 -1)%3;
                switch(quarterInCycle){
                    case 0:
                        spawnInT = 3 * beatInterval/2 - timeDif;
                        break;
                    case 1:
                        if(timeDif > beatInterval/2){
                            spawnInT = 2 * beatInterval - timeDif;
                        }
                        else{
                            spawnInT = beatInterval/2 - timeDif;
                        }
                        break;
                    case 2:
                        spawnInT = beatInterval - timeDif;
                        break;
                }
                break;
        }
        return spawnInT;
    }

    getTimeFromDuration(duration, durationType){
        let timeMs;

        let durationInt = parseInt(duration.replace("n", "").replace(".", ""))
        switch(durationType){
            case "normal":
                timeMs = 60000/120 * (4/durationInt)
                break;
            case "dotted":
                timeMs = 60000/120 * (4/durationInt) * 3/2
                break;
        }

        return timeMs;
    }

    destroy(){
        delete ScheduledBullet.list[this.id];
    }
}

export class Bullet extends Entity{
    static list = {};

    constructor(parent, angle, note, durationType, damage){
        super(parent.x, parent.y);
        this.id = Math.random();
        this.parent = parent;
        this.speed = 20;

        this.entityType = "bullet";

        angle = angle + 10*(Math.random()-0.5);

        this.spdX = Math.cos(angle/180*Math.PI) * this.speed;
        this.spdY = Math.sin(angle/180*Math.PI) * this.speed;

        this.sound = parent.weapon.sound;
        this.duration = parent.weapon.duration;
        this.durationType = durationType;
        this.damage = damage;

        // switch(note){
        //     case "onSpawn":
        //         this.note = parent.selectedNote;
        //         break;
        //     case //first character is "+":
        //         //do something
        //         break;
        //     default:
        //         this.note = note;
        //         break;
        // }
        if(note == 'onSpawn') this.note = parent.selectedNote;
        else if(note.startsWith("+")){
            let transposedNote = scale.getTransposed(parent.selectedNote, parseInt(note[1]));
            if(scale.allowedNotes.includes(transposedNote)) this.note = transposedNote; //major third
            else this.note = scale.getTransposed(parent.selectedNote, parseInt(note[1] - 1)) //minor third
        }
        else this.note = note;

        Bullet.list[this.id] = this;

        let durationTimeout;
        switch(durationType){
            case "normal":
                durationTimeout = 60000/120 * (4/parseInt(this.duration.replace("n", "")));
                break;
            case "dotted":
                durationTimeout = 60000/120 * (4/parseInt(this.duration.replace("n", "").replace(".", ""))) * 3/2;
                break;
        }        

        this.timeout = setTimeout(()=>{
            // delete itself after timeout??
            this.destroy();
        }, durationTimeout)
        return this;
    }

    update(){
        this.x += this.spdX;
        this.y += this.spdY;

        this.spdX *= 1.01;
        this.spdY *= 1.01;

        //collision check
        let hitPlayerId = this.collidingPlayerId(Character.list);
        let isCollidingWall = checkTilesCollision(this.x, this.y, wallQTree)

        //player hit:
        if(hitPlayerId != null){
            let targetPlayer = Character.list[hitPlayerId];
            if(this.parent != targetPlayer){
                this.destroy();
                targetPlayer.takeDmg(this.damage, this.parent);
            }
        }

        //bullet self-guiding
        this.selfGuide();

        //wall hit:
        if(isCollidingWall){
            this.destroy();
        }
    }

    findNearestSameNote(objList, maxDistance){
        //TODO: room for optimization
        let nearest = null;
        let minDistSq = maxDistance * maxDistance;

        const nearestCandidates = bulletQTree.retrieve({
            x: this.x - maxDistance,
            y: this.y - maxDistance,
            width: maxDistance*2,
            height: maxDistance*2
        })

        //checking quadtree efficiency:
        // console.log(nearestCandidates.length, Object.keys(objList).length)

        if(nearestCandidates.length == 0) return null;
        for(let candidate of nearestCandidates){
            const other = objList[candidate.id]
            if(!other) continue;
            if(other === this) continue;
            if(other.parent === this.parent) continue;
            if(other.note !== this.note) continue;

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
        //     if(other.parent === this.parent) continue;
        //     if(other.note !== this.note) continue;

        //     const dx = this.x - other.x;
        //     const dy = this.y - other.y;
        //     const distSq = dx*dx + dy*dy;

        //     if(distSq < minDistSq){
        //         minDistSq = distSq;
        //         nearest = other;
        //     }

        //     // if(minDistSq < 500){
        //     //     this.destroy();
        //     // }
        // }

        return nearest;
    }

    selfGuide(){
        //self-guide to the nearest bullet with same note/tone:
        let nearestSameBullet = this.findNearestSameNote(Bullet.list, 600); //have to check 1) type 2) parent
        if(nearestSameBullet){
            this.guideTo(nearestSameBullet);
            return;
        }

        //self-guide to the nearest player/bot in set range:
        let nearestPlayer = this.findNearest(Character.list, characterQTree, 300);

        if(nearestPlayer === this.parent) return;
        if(nearestPlayer){
            this.guideTo(nearestPlayer);
            return;
        }
    }

    guideTo(obj){
        const dx = obj.x - this.x;
        const dy = obj.y - this.y;
        const dist = Math.hypot(dx, dy)
        const targetSpdX = (dx/dist) * this.speed;
        const targetSpdY = (dy/dist) * this.speed;

        //weighted mean between current speeds and guiding speed:
        //(3 to 1 weights)
        this.spdX = (3*this.spdX + targetSpdX)/4;
        this.spdY = (3*this.spdY + targetSpdY)/4;
    }
    
    destroy(){
        clearTimeout(this.timeout);
        for(let i in Player.list){
            let player = Player.list[i]
            player.addToRemovePack(this.id, "bullet");
        }
        delete Bullet.list[this.id]
    }

    static updateAll(){
        for(var i in Bullet.list){ 
            var bullet = Bullet.list[i];
            
            bullet.update();
        }
    }
}