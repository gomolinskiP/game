import { Entity } from './Entity.js';
import { Player } from './Player.js';
import {removePack} from '../socket.js'
import { bulletCollisionLayer, checkWallCollision } from '../socket.js';


export class scheduledBullet{
    static list = {};

    constructor(parent){
        this.id = Math.random();
        this.parent = parent;

        this.sound = parent.weapon.sound;
        this.duration = parent.weapon.duration;
        this.note = parent.selectedNote;

        scheduledBullet.list[this.id] = this;
        return this;
    }

    spawn(){
        new Bullet(this.parent, this.parent.lastAngle);
    }
}

export class Bullet extends Entity{
    static list = {};

    constructor(parent, angle){
        super(parent.x, parent.y);
        this.id = Math.random();
        this.parent = parent;
        this.speed = 20;

        angle = angle + 10*(Math.random()-0.5);

        this.spdX = Math.cos(angle/180*Math.PI) * this.speed;
        this.spdY = Math.sin(angle/180*Math.PI) * this.speed;

        this.sound = parent.weapon.sound;
        this.duration = parent.weapon.duration;
        this.note = parent.selectedNote;

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