import { Entity } from './Entity.js';
import { Weapon } from './Weapon.js';
import { Bullet, scheduledBullet } from './Bullet.js';
import { collisionLayer, checkWallCollision } from '../socket.js';
import { scale } from '../socket.js';

export class Player extends Entity{
    static list = {}

    constructor(id, x, y, username, weapon = null){
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

        this.selectedNote = scale.base;

        if(weapon == null) weapon = new Weapon("Synth", "1n", "normal", this, "normal")
        this.giveWeapon(weapon.sound, weapon.duration, "normal", "normal");

        Player.list[this.id] = this;
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

        
        // console.log(this.weapon)
    }

    changeSelectedNote(note){
        this.selectedNote = note;
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
    
    getInitPack(pickupList){
        let initPack = {};

        initPack.player = []
        for(var i in Player.list){
            initPack.player.push({
                x: Player.list[i].x,
                y: Player.list[i].y,
                id: Player.list[i].id,
                name: Player.list[i].name,
                hp: Player.list[i].hp,
                direction: Player.list[i].lastAngle
            })
        }

        initPack.bullet = []

        initPack.pickup = []
        for(var i in pickupList){
            initPack.pickup.push({
                x: pickupList[i].x,
                y: pickupList[i].y,
                id: pickupList[i].id,
            })
        }

        initPack.selfId = this.id;
        initPack.selectedNote = this.selectedNote;
        initPack.scale = {name: `${scale.base} ${scale.type}`, allowedNotes: scale.allowedNotes}

        return initPack;
    }

    static updateAll(updatePack){
        for(var i in Player.list){ 
            var player = Player.list[i];

            if(player.needsUpdate){
                player.updatePosition();
                updatePack.player.push({
                    x: player.x,
                    y: player.y,
                    id: player.id,
                    name: player.name,
                    hp: player.hp,
                    direction: player.lastAngle,
                })
            }
        }
    }
}