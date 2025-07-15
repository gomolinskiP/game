import { Entity } from './Entity.js';
import { Player } from './Player.js';
import {scale, removePack} from '../socket.js'
import { bulletCollisionLayer, checkWallCollision } from '../socket.js';


export class scheduledBullet{
    static list = {};

    constructor(parent, note = 'onSpawn'){
        this.id = Math.random();
        this.parent = parent;

        this.sound = parent.weapon.sound;
        this.duration = parent.weapon.duration;
        this.note = note;

        scheduledBullet.list[this.id] = this;
        return this;
    }

    spawn(){
        new Bullet(this.parent, this.parent.lastAngle, this.note);
    }
}

export class Bullet extends Entity{
    static list = {};

    constructor(parent, angle, note){
        super(parent.x, parent.y);
        this.id = Math.random();
        this.parent = parent;
        this.speed = 20;

        angle = angle + 10*(Math.random()-0.5);

        this.spdX = Math.cos(angle/180*Math.PI) * this.speed;
        this.spdY = Math.sin(angle/180*Math.PI) * this.speed;

        this.sound = parent.weapon.sound;
        this.duration = parent.weapon.duration;

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

        let durationTimeout = 60000/120 * (4/parseInt(this.duration.replace("n", "")))

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
        let hitPlayerId = this.collidingPlayerId();
        let isCollidingWall = checkWallCollision(this.x, this.y-32, bulletCollisionLayer)
        //player hit:
        if(hitPlayerId != null){
            let targetPlayer = Player.list[hitPlayerId];
            if(this.parent != targetPlayer){
                clearTimeout(this.timeout);
                this.destroy();
                targetPlayer.takeDmg(1);
            }
        }
        //wall hit:
        if(isCollidingWall){
            clearTimeout(this.timeout);
            this.destroy();
        }

        // for(let i in Player.list){
        //     let targetPlayer = Player.list[i];
        //     if(this.parent != targetPlayer && this.isColliding(targetPlayer)){
        //         clearTimeout(this.timeout);
        //         this.destroy();
        //         targetPlayer.takeDmg(1);
        //     }
        // }
    }
    


    destroy(){
        removePack.bullet.push(this.id)
        delete Bullet.list[this.id]
    }
}