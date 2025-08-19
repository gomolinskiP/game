import { Weapon } from './Weapon.js';
import { Bullet, scheduledBullet } from './Bullet.js';
import { Pickup } from './Pickup.js';
import { characterQTree, bulletQTree, tileQTree, pickupQTree } from '../socket.js';
import { scale, BPM } from '../socket.js';
import { Socket } from './Socket.js';
import { Character } from './Character.js';
import { Tile } from './Tile.js'

const loadDistance = 1600; //TODO: should be AT LEAST double the LONGEST distance a bullet can travel!!!
const loadUnloadMargin = 1600;
const unloadDistance = loadDistance + loadUnloadMargin;

export class Player extends Character{
    static list = {}

    static updateAll(){
        for(var i in Player.list){ 
            var player = Player.list[i];

            player.getUpdatePack();
            player.emitUpdatePack();
            player.addFarToRemovePack();
            player.emitRemovePack();
        }

        for(var i in Character.list){ 
            var player = Character.list[i];

            if(player.needsUpdate){
                player.updatePosition();
            }  
        }
    }

    constructor(id, x, y, username, weapon = null, score = 0){
        super(id, x, y, username, weapon, score);
        this.id = id;

        Player.list[this.id] = this;

        this.knownObjIDs = [] //all objects' IDs known to this player

        this.initPack = this.getInitPack();
        this.emitInitPack();
        this.updatePack = [];
        this.removePack = [];

        return this;
    }

    giveWeapon(sound, duration, type){
        super.giveWeapon(sound, duration, type);

        if(!this.updatePack) return;
        this.updatePack.push({
            weaponType: type,
            duration: duration,
            type: "weapon",
        })
    }
    
    getInitPack(){
        let initPack = {};
        initPack.entities = []
        const loadRect = {
            x: this.x - loadDistance,
            y: this.y - loadDistance,
            width: loadDistance*2,
            height: loadDistance*2,
        }

        //get characters in load distance from character quadtree:
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

        //get pickups in load distance from character quadtree:
        let pickupsToLoad = pickupQTree.retrieve(loadRect)

        for(const pu of pickupsToLoad){
            const pickup = Pickup.list[pu.id]
            if(!this.isWithinDistance(pickup, loadDistance)) continue;

            initPack.entities.push({
                x: pickup.x,
                y: pickup.y,
                type: "pickup",
                id: pickup.id,
            })

            this.knownObjIDs.push(pickup.id)
        }

        //get pickups in load distance from character quadtree:
        let tilesToLoad = tileQTree.retrieve(loadRect)

        for(const t of tilesToLoad){
            const tile = Tile.list[t.id]
            if(!this.isWithinDistance(tile, loadDistance)) continue;

            initPack.entities.push({
                type: "tile",
                id: tile.id,
                x: tile.x,
                y: tile.y,
                gid: tile.gid,
                layerId: tile.layerId
            })

            this.knownObjIDs.push(tile.id)
        }

        initPack.selfId = this.id;
        initPack.selectedNote = this.selectedNote;
        initPack.scale = {
            name: `${scale.base} ${scale.type}`,
            allowedNotes: scale.allowedNotes
        }
        initPack.bpm = BPM;

        initPack.weapon = {
            sound: this.weapon.sound,
            duration: this.weapon.duration,
            type: this.weapon.type,
        }

        return initPack;
    }


    emitInitPack(){
        let socket = Socket.list[this.id]
        socket.emit('init', this.initPack)
        this.initPack = {};
        return;
    }

    getUpdatePack(){
        const loadRect = {
            x: this.x - loadDistance,
            y: this.y - loadDistance,
            width: loadDistance * 2,
            height: loadDistance * 2
        }

        //TODO: based on proximity to player:
        let charactersToUpdate = characterQTree.retrieve(loadRect)

        for(const c of charactersToUpdate){
            const character = Character.list[c.id];
            if(!this.isWithinDistance(character, loadDistance)) continue;

            if(character.needsUpdate || !this.knownObjIDs.includes(character.id)){
                this.updatePack.push({
                    x: character.x,
                    y: character.y,
                    type: "player",
                    id: character.id,
                    name: character.name,
                    hp: character.hp,
                    score: character.score,
                    direction: character.lastAngle,
                })

                if(!this.knownObjIDs.includes(character.id)){
                    this.knownObjIDs.push(character.id);
                }
            }
        }


        let bulletsToUpdate = bulletQTree.retrieve(loadRect)

        for(const b of bulletsToUpdate){
            const bullet = Bullet.list[b.id];
            if(!bullet) continue;
            if(!this.isWithinDistance(bullet, loadDistance)) continue;

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

            if(!this.knownObjIDs.includes(bullet.id)){
                this.knownObjIDs.push(bullet.id);
            }
        }


        let pickupsToUpdate = pickupQTree.retrieve(loadRect)

        for(const pu of pickupsToUpdate){
            const pickup = Pickup.list[pu.id];
            if(!pickup) continue;
            if(!this.isWithinDistance(pickup, loadDistance)) continue;

            //pickups need to be updated if they are not yet known to player (they're static):
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


        let tilesToUpdate = tileQTree.retrieve(loadRect)

        for(const t of tilesToUpdate){
            const tile = Tile.list[t.id];
            if(!this.isWithinDistance(tile, loadDistance)) continue;

            //tiles are static - need to be updated if player does not know about them yet:
            if(!this.knownObjIDs.includes(tile.id)){
                this.updatePack.push({
                    type: "tile",
                    id: tile.id,
                    x: tile.x,
                    y: tile.y,
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

    addFarToRemovePack(){
        const unloadRect = {
            x: this.x - unloadDistance,
            y: this.y - unloadDistance,
            width: unloadDistance * 2,
            height: unloadDistance * 2
        }

        // //for characters:
        let notToRemoveIDs = []
        let charactersNotToRemove = characterQTree.retrieve(unloadRect);
        for(const c of charactersNotToRemove){
            if(!this.isWithinDistance(c, unloadDistance)) continue;
            notToRemoveIDs.push(c.id);
        }

        for(let id in Character.list){
            const character = Character.list[id];
            if(!this.knownObjIDs.includes(character.id)) continue;
            if(notToRemoveIDs.includes(character.id)) continue;
            if(!this.isWithinDistance(character, unloadDistance)){
                this.addToRemovePack(character.id, 'player');
            }
        }

        //skip bullets (let them just be removed by timeout)

        //for pickups:
        let pickupsNotToRemove = pickupQTree.retrieve(unloadRect);
        notToRemoveIDs = []
        for(const pu of pickupsNotToRemove){
            if(!this.isWithinDistance(pu, unloadDistance)) continue;
            notToRemoveIDs.push(pu.id);
        }

        for(let id in Pickup.list){
            const pickup = Pickup.list[id];
            if(!this.knownObjIDs.includes(pickup.id)) continue;
            if(notToRemoveIDs.includes(pickup.id)) continue;
            if(!this.isWithinDistance(pickup, unloadDistance)){
                this.addToRemovePack(pickup.id, 'pickup');
            }
        }

        // for tiles:
        let tilesNotToRemove = tileQTree.retrieve(unloadRect);
        notToRemoveIDs = []
        for(const t of tilesNotToRemove){
            if(!this.isWithinDistance(t, unloadDistance)) continue;
            notToRemoveIDs.push(t.id);
        }

        for(let id in Tile.list){
            const tile = Tile.list[id];
            if(!this.knownObjIDs.includes(tile.id)) continue;
            if(notToRemoveIDs.includes(tile.id)) continue;
            if(!this.isWithinDistance(tile, unloadDistance)){
                this.addToRemovePack(tile.id, 'tile');
            }
        }
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