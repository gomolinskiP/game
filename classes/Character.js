import { Entity } from "./Entity.js";
import { Weapon } from './Weapon.js';
import { Bullet, scheduledBullet } from './Bullet.js';
import { Pickup } from './Pickup.js';
import { collisionLayer, checkWallCollision } from '../socket.js';
import { Player } from "./Player.js";
import { scale } from '../socket.js';
import { Socket } from './Socket.js';

const loadDistance = 100; //TODO: should be AT LEAST double the LONGEST distance a bullet can travel!!!
const loadUnloadMargin = 50;
const unloadDistance = loadDistance + loadUnloadMargin;

export class Character extends Entity{
    static list = {}
    
    constructor(id, x, y, username, weapon = null, score = 0){
        super(x, y);
        this.id = id;
        this.name = username;
        this.hp = 100;
        this.score = score;
        // this.socketIDs = [id]; //bots won't have socket ids

        this.entityType = "player";

        this.needsUpdate = true;

        this.pressingUp = this.pressingDown = this.pressingLeft = this.pressingRight = this.pressingSpace = false;
        this.speed = 10;
        this.lastAngle = 90;
        this.shootTimeout = false;

        this.selectedNote = scale.base;

        if(weapon == null) weapon = new Weapon("Synth", "1n", "normal", this, "normal")
        this.giveWeapon(weapon.sound, weapon.duration, "normal", "normal");

        Character.list[this.id] = this;

        return this;
    }

    updatePosition(){
        if(this.pressingUp){
            this.dirY = -1
        } 
        else if(this.pressingDown){
            this.dirY = 1
        }
        else{
            this.dirY = 0
        }
        if(this.pressingLeft){
            this.dirX = -1
        }
        else if(this.pressingRight){
            this.dirX = 1
        }
        else{
            this.dirX = 0
        }

        if(!this.pressingUp && !this.pressingDown && !this.pressingLeft && !this.pressingRight)
            // console.log("---") //TO FIX -- animation does not stop when player stops walking because he stops getting updated!!
            this.needsUpdate = false;
        else{
            this.dirY *= 50/100 //SCALER if map image is in perspective
            this.lastAngle = Math.atan2(this.dirY, this.dirX) * 180/Math.PI;
            this.spdX = Math.cos(this.lastAngle/180*Math.PI) * this.speed
            this.spdY = Math.sin(this.lastAngle/180*Math.PI) * this.speed

            

            //check collision with collisionLayer:
            let newX = this.x + this.spdX
            let newY = this.y + this.spdY

            if(!checkWallCollision(newX, newY, collisionLayer)){
                this.x = newX
                this.y = newY 
            }
            
        }

        //shooting:
        if(this.pressingSpace){
            this.needsUpdate = true;
            if(!this.shootTimeout){
                
                this.shootTimeout = true;
                this.weapon.shoot(this.selectedNote);

                setTimeout(()=>{
                    this.shootTimeout = false
                }, this.shootTimeoutTime)
            }
        }
    }

    giveWeapon(sound, duration, type, durationType){
        this.weapon = new Weapon(sound, duration, type, this, durationType)
        let durationInt = parseInt(duration.replace("n", "").replace(".", ""))
        switch(durationType){
            case "normal":
                this.shootTimeoutTime = 60000/120 * (4/durationInt)
                break;
            case "dotted":
                this.shootTimeoutTime = 60000/120 * (4/durationInt) * 3/2
                break;
        }
    }

    addScore(points){
        this.score += points;
    }

    changeSelectedNote(note){
        this.selectedNote = note;
    }

    takeDmg(damage, byWho){
        this.hp -= damage;
        if(this.hp <= 0){
            this.die(byWho);
        }
        this.needsUpdate = true;
    }

    die(byWho){
        byWho.addScore(100);
        let killMsg = `<i>${byWho.name} killed ${this.name}</i>`
        for(var i in Socket.list){
            var socket = Socket.list[i];
            socket.emit('chatBroadcast', killMsg);
        }
        this.hp = 100;
        this.x = 0 + 250*(Math.random());
        this.y = 0 + 120*(Math.random());
        this.needsUpdate = true;
    }
}