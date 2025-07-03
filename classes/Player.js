import { Entity } from './Entity.js';
import { Weapon } from './Weapon.js';
import { Bullet, scheduledBullet } from './Bullet.js';

export class Player extends Entity{
    static list = {}

    constructor(id, x, y, username, weapon){
        super(x, y);
        this.id = id;
        this.name = username;
        this.hp = 100;
        this.socketIDs = [id];
        this.needsUpdate = true;
        this.pressingUp = false;
        this.pressingDown = false;
        this.pressingLeft = false;
        this.pressingRight = false;
        this.pressingSpace = false;
        this.speed = 10;
        this.lastAngle = 90;
        this.shootTimeout = false;

        this.selectedNote = "F"

        this.giveWeapon(weapon.sound, weapon.duration);
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
            this.needsUpdate = false
        else{
            this.dirY *= 58/100 //SCALER if map image is in perspective
            this.lastAngle = Math.atan2(this.dirY, this.dirX) * 180/Math.PI;
            this.spdX = Math.cos(this.lastAngle/180*Math.PI) * this.speed
            this.spdY = Math.sin(this.lastAngle/180*Math.PI) * this.speed

            this.x += this.spdX
            this.y += this.spdY
        }

        if(this.pressingSpace){
            this.needsUpdate = true;
            if(!this.shootTimeout){
                
                this.shootTimeout = true;
                new scheduledBullet(this)
                new scheduledBullet(this)
                new scheduledBullet(this)

                setTimeout(()=>{
                    this.shootTimeout = false
                }, this.shootTimeoutTime)
            }
        }
    }

    giveWeapon(sound, duration){
        this.weapon = new Weapon(sound, duration)
        let durationInt = parseInt(duration.replace("n", ""))
        this.shootTimeoutTime = 60000/120 * (4/durationInt)
        console.log(this.weapon)
    }

    takeDmg(damage){
        this.hp -= damage;
        if(this.hp <= 0) this.die();
        this.needsUpdate = true;
    }

    die(){
        this.hp = 100;
        this.x = 1000 + 250*(Math.random());
        this.y = 500 + 120*(Math.random());
        this.needsUpdate = true;
    }
    
}