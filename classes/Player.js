import { Entity } from './Entity.js';
import { Weapon } from './Weapon.js';
import { Bullet, scheduledBullet } from './Bullet.js';
import { Pickup } from './Pickup.js';
import { collisionLayer, checkWallCollision } from '../socket.js';
import { scale } from '../socket.js';
import { Socket } from './Socket.js';

export class Player extends Entity{
    static list = {}

    constructor(id, x, y, username, weapon = null){
        super(x, y);
        this.id = id;
        this.name = username;
        this.hp = 100;
        this.socketIDs = [id];

        this.entityType = "player";

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

        this.knownObjIDs = [] //all objects known to this player

        this.initPack = this.getInitPack(Pickup.list); //TODO
        this.emitInitPack();
        this.updatePack = []; //TODO
        this.removePack = []; //TODO



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
        this.x = 0 + 250*(Math.random());
        this.y = 0 + 120*(Math.random());
        this.needsUpdate = true;
    }
    
    getInitPack(pickupList){
        let initPack = {};
        initPack.entities = []
        for(var i in Player.list){
            let player = Player.list[i]
            initPack.entities.push({
                x: player.x,
                y: player.y,
                type: "player",
                id: player.id,
                name: player.name,
                hp: player.hp,
                direction: player.lastAngle
            })

            this.knownObjIDs.push(player.id)
        }
        for(var i in pickupList){
            let pickup = pickupList[i];
            initPack.entities.push({
                x: pickup.x,
                y: pickup.y,
                type: "pickup",
                id: pickup.id,
            })

            this.knownObjIDs.push(pickup.id)
        }

        initPack.selfId = this.id;
        initPack.selectedNote = this.selectedNote;
        initPack.scale = {name: `${scale.base} ${scale.type}`, allowedNotes: scale.allowedNotes}

        return initPack;
    }

    static updateAll(){
        for(var i in Player.list){ 
            var player = Player.list[i];

            player.getUpdatePack();
            player.emitUpdatePack();
            player.emitRemovePack();

            if(player.needsUpdate){
                player.updatePosition();
                player.addToUpdatePack();
            }  
        }
    }

    emitInitPack(){
        let socket = Socket.list[this.id]
        socket.emit('init', this.initPack)
        return;
    }

    getUpdatePack(){
        //TODO: based on proximity to player:

        for(let i in Bullet.list){
            let bullet = Bullet.list[i]
            if((Math.abs(this.x - bullet.x) < 100 && Math.abs(this.y - bullet.y) < 100) || 1==1){
                this.updatePack.push({
                    x: bullet.x,
                    y: bullet.y,
                    id: bullet.id,
                    type: "bullet",
                    parentId: bullet.parent.id,

                    sound: bullet.sound,
                    duration: bullet.duration,
                    note: bullet.note
                })
                if(!this.knownObjIDs.includes(bullet.id)) this.knownObjIDs.push(bullet.id);
            }
        }

        for(let i in Pickup.list){
            let pickup = Pickup.list[i]
            if(!this.knownObjIDs.includes(pickup.id)){
                this.updatePack.push({
                    x: pickup.x,
                    y: pickup.y,
                    id: pickup.id,
                    type: "pickup"
                })

                // pickup.needsUpdate = false;
                this.knownObjIDs.push(pickup.id);
            }
        }

    }

    addToUpdatePack(){
        //player adds themself to other players updatePacks:
        for(let i in Player.list){
            let player = Player.list[i]

            player.updatePack.push({
                x: this.x,
                y: this.y,
                type: "player",
                id: this.id,
                name: this.name,
                hp: this.hp,
                direction: this.lastAngle,
            })

            if(!player.knownObjIDs.includes(this.id)) player.knownObjIDs.push(this.id);
        }
    }

    emitUpdatePack(){
        let socket = Socket.list[this.id]
        if(!socket){
            console.log(`ERROR NO SOCKET WHILE EMITTING UPDATE PACK`)
            this.updatePack = [];
            return;
        }

        if(this.updatePack.length){
            socket.emit('update', this.updatePack)
            this.updatePack = [];
        }
        
        return;
    }

    addToRemovePack(id){

    }

    emitRemovePack(){
        let socket = Socket.list[this.id]
        if(!socket){
            console.log(`ERROR NO SOCKET WHILE EMITTING REMOVE PACK`)
            this.removePack = [];
            return;
        }

        for(let entity of this.removePack){
            if(this.knownObjIDs.includes(entity.id)){
                this.knownObjIDs = this.knownObjIDs.filter(id => id !== entity.id)
            }
            else{
                console.log("Trying to remove something player is not aware of!!!")
            }
        }

        if(this.removePack.length){
            let socket = Socket.list[this.id]
            socket.emit('remove', this.removePack);
            this.removePack = [];
        }
    }
}