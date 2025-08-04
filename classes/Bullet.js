import { Entity } from './Entity.js';
import { Player } from './Player.js';
import {scale} from '../socket.js'
import { bulletCollisionLayer, checkWallCollision } from '../socket.js';
import { Character } from './Character.js';


export class scheduledBullet{
    static list = {};

    constructor(parent, note = 'onSpawn', durationType, damage){
        this.id = Math.random();
        this.parent = parent;

        this.sound = parent.weapon.sound;
        this.duration = parent.weapon.duration;
        this.durationType = durationType;
        this.damage = damage;
        
        this.note = note;

        scheduledBullet.list[this.id] = this;
        return this;
    }

    spawn(){
        new Bullet(this.parent, this.parent.lastAngle, this.note, this.durationType, this.damage);
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

        //collision check
        let hitPlayerId = this.collidingPlayerId(Character.list);
        let isCollidingWall = checkWallCollision(this.x, this.y-32, bulletCollisionLayer)
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

        for(let i in objList){
            let other = objList[i];

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

            // if(minDistSq < 500){
            //     this.destroy();
            // }
        }

        return nearest;
    }

    selfGuide(){
        //self-guide to the nearest bullet with same note/tone:
        let nearestSameBullet = this.findNearestSameNote(Bullet.list, 200); //have to check 1) type 2) parent
        if(nearestSameBullet){
            this.guideTo(nearestSameBullet);
            return;
        }

        //self-guide to the nearest player/bot in set range:
        let nearestPlayer = this.findNearest(Character.list, 150);

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

        this.spdX = (dx/dist) * this.speed;
        this.spdY = (dy/dist) * this.speed;
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