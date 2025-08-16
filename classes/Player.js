import { Weapon } from './Weapon.js';
import { Bullet, scheduledBullet } from './Bullet.js';
import { Pickup } from './Pickup.js';
import { collisionLayer, checkWallCollision } from '../socket.js';
import { scale } from '../socket.js';
import { Socket } from './Socket.js';
import { Character } from './Character.js';
import { Tile } from './Tile.js'

const loadDistance = 500; //TODO: should be AT LEAST double the LONGEST distance a bullet can travel!!!
const loadUnloadMargin = 100;
const unloadDistance = loadDistance + loadUnloadMargin;

export class Player extends Character{
    static list = {}

    constructor(id, x, y, username, weapon = null, score = 0){
        super(id, x, y, username, weapon, score);
        this.id = id;

        Player.list[this.id] = this;

        this.knownObjIDs = [] //all objects' IDs known to this player

        this.initPack = this.getInitPack(Pickup.list);
        this.emitInitPack();
        this.updatePack = [];
        this.removePack = [];

        return this;
    }

    giveWeapon(sound, duration, type, durationType){
        super.giveWeapon(sound, duration, type, durationType);

        if(!this.updatePack) return;
        this.updatePack.push({
            weaponType: type,
            duration: duration,
            type: "weapon",
        })
    }
    
    getInitPack(pickupList){
        let initPack = {};
        initPack.entities = []
        for(var i in Character.list){
            let player = Character.list[i]
            //check distance:
            if(Math.abs(player.x - this.x) > loadDistance ||
               Math.abs(player.y - this.y) > loadDistance) continue;
            
            initPack.entities.push({
                x: player.x,
                y: player.y,
                type: "player",
                id: player.id,
                name: player.name,
                hp: player.hp,
                score: player.score,
                direction: player.lastAngle
            })

            this.knownObjIDs.push(player.id)
        }
        for(var i in pickupList){
            let pickup = pickupList[i];
            //check distance:
            if(Math.abs(pickup.x - this.x) > loadDistance ||
               Math.abs(pickup.y - this.y) > loadDistance) continue;
            initPack.entities.push({
                x: pickup.x,
                y: pickup.y,
                type: "pickup",
                id: pickup.id,
            })

            this.knownObjIDs.push(pickup.id)
        }

        for(let i in Tile.list){
            let tile = Tile.list[i];
            //check distance:
            if(Math.abs(tile.ortX - this.x) > loadDistance ||
               Math.abs(tile.ortY - this.y) > loadDistance) continue;
            
            initPack.entities.push({
                type: "tile",
                id: tile.id,
                x: tile.ortX,
                y: tile.ortY,
                gid: tile.gid,
                layerId: tile.layerId
            })

            this.knownObjIDs.push(tile.id)
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
        }

        for(var i in Character.list){ 
            var player = Character.list[i];

            if(player.needsUpdate){
                player.updatePosition();
            }  
        }
    }

    emitInitPack(){
        let socket = Socket.list[this.id]
        socket.emit('init', this.initPack)
        this.initPack = {};
        return;
    }

    getUpdatePack(){
        //TODO: based on proximity to player:

        for(let i in Character.list){
            let player = Character.list[i]
            //check distance:
            if(Math.abs(player.x - this.x) > unloadDistance ||
            Math.abs(player.y - this.y) > unloadDistance){
                if(this.knownObjIDs.includes(player.id)){
                    this.addToRemovePack(player.id, "player");
                }
                // console.log(`added ${this.name} to ${player.name}'s remove pack (unloadDistance)`)
            }
            else{
                if(player.needsUpdate || !this.knownObjIDs.includes(player.id)){
                    this.updatePack.push({
                        x: player.x,
                        y: player.y,
                        type: "player",
                        id: player.id,
                        name: player.name,
                        hp: player.hp,
                        score: player.score,
                        direction: player.lastAngle,
                    })

                    if(!this.knownObjIDs.includes(player.id)){
                        this.knownObjIDs.push(player.id);
                    }
                }
            }
        }

        for(let i in Bullet.list){
            let bullet = Bullet.list[i]
            //check distance:
            if(Math.abs(bullet.x - this.x) > unloadDistance ||
               Math.abs(bullet.y - this.y) > unloadDistance){
                this.addToRemovePack(bullet.id, "bullet");
                continue;
            };
            
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

        for(let i in Pickup.list){
            let pickup = Pickup.list[i]
            //check distance:
            if(Math.abs(pickup.x - this.x) > unloadDistance ||
               Math.abs(pickup.y - this.y) > unloadDistance){
                this.addToRemovePack(pickup.id, "pickup")
                continue;
            };

            if(!this.knownObjIDs.includes(pickup.id)){
                this.updatePack.push({
                    x: pickup.x,
                    y: pickup.y,
                    id: pickup.id,
                    type: "pickup"
                })

                this.knownObjIDs.push(pickup.id);
            }
        }

        for(let i in Tile.list){
            let tile = Tile.list[i]
            //check distance:
            if(Math.abs(tile.ortX - this.x) > unloadDistance ||
               Math.abs(tile.ortY - this.y) > unloadDistance){
                this.addToRemovePack(tile.id, "tile")
                continue;
            };

            if(!this.knownObjIDs.includes(tile.id)){
                this.updatePack.push({
                    type: "tile",
                    id: tile.id,
                    x: tile.ortX,
                    y: tile.ortY,
                    gid: tile.gid,
                    layerId: tile.layerId
                })

                this.knownObjIDs.push(tile.id);
            }
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

    addToRemovePack(id, type){
        if(!this.knownObjIDs.includes(id)){
            // console.log(`${id} (${type}) is not known to ${this.name}`)
            return;
        }
        this.removePack.push({
            id: id,
            type: type
        })
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