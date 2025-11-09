import { Weapon } from './Weapon.js';
import { Bullet } from './Bullet.js';
import { Pickup } from './Pickup.js';
import { Sounds } from '../musical/Sounds.js';
import { Socket } from '../Socket.js';
import { Character } from './Character.js';
import { Tile } from './Tile.js'

const loadDistance = 1200; //TODO: should be AT LEAST double the LONGEST distance a bullet can travel!!!
const loadUnloadMargin = 0;
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

        this.characterType = 'player';

        Player.list[this.id] = this;

        this.knownObjIDs = [] //all objects' IDs known to this player

        this.initPack = this.getInitPack();
        this.emitInitPack();
        this.updatePack = [];
        this.removePack = [];

        return this;
    }

    // getEnvironment(){
    //     const state = [];
    //     // - 9 najbliższych kafelków mapy (x i y); 
    //     // - 1 najbliższy obiekt klasy Pickup (x i y); 
    //     // - 1 najbliższy obiekt klasy bullet (x, y oraz parametr "note"); 
    //     // - 1 najbliższy obiekt klasy Character (x, y oraz HP); 
    //     // - czas serwera, 
    //     // - informacje o sobie (x, y, HP)

    //     //self-info
    //     // state.push(0, 0, this.hp/1000);

    //     state.push(this.spdX/this.speed, this.spdY/this.speed);

    //     const gridDims = 5; //5x5 grid around agent
    //     //2:1 grid because of isometric view and proportions:
    //     const cellW = 200;
    //     const cellH = 100;

    //     let minDX = gridDims*cellW/2;
    //     let minDY = gridDims*cellH/2;
    //     let minDistSq = minDX*minDX + minDY*minDY;
    //     const maxDistSq = minDistSq;
    //     console.log(minDX, minDY, minDistSq)

    //     for(let i = 0; i < gridDims; i++){
    //         for(let j = 0; j < gridDims; j++){
    //             const cellX = this.x - (gridDims * cellW) / 2 + j * cellW;
    //             const cellY = this.y - (gridDims * cellH) / 2 + i * cellH;

    //             let isPickupInCell = 0;
                
    //             const pickupCandidates = Pickup.quadtree.retrieve({
    //                 x: cellX,
    //                 y: cellY,
    //                 width: cellW,
    //                 height: cellH,
    //             })

    //             for(const pickup of pickupCandidates){
    //                 if(pickup.x > cellX &&
    //                     pickup.x < cellX + cellW &&
    //                     pickup.y > cellY &&
    //                     pickup.y < cellY + cellH
    //                 ){
    //                     isPickupInCell = 1;
    //                     const dx = this.x - pickup.x;
    //                     const dy = this.y - pickup.y;
    //                     const distSq = dx*dx + dy*dy;

    //                     if(distSq < minDistSq){
    //                         minDistSq = distSq;
    //                         minDX = dx;
    //                         minDY = dy;
    //                     }
    //                 }
    //             }

    //             state.push(isPickupInCell);
    //         }
    //     }
    //     if(!this.lastMinDistSq) this.lastMinDistSq = minDistSq;
    //     else{
    //         console.log(minDistSq, this.lastMinDistSq, Math.sqrt(this.lastMinDistSq) - Math.sqrt(minDistSq))
    //         this.lastMinDistSq = minDistSq;
    //     }
        
    //     state.push(minDX/maxDistSq, minDY/maxDistSq);
    //     this.updatePack.push(state);
    // }

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
        const charactersToLoad = Character.quadtree.retrieve(loadRect);
        for(const candidate of charactersToLoad){
            const character = Character.list[candidate.id];

            if(!this.isWithinDistance(character, loadDistance)) continue;

            initPack.entities.push({
                x: character.x,
                y: character.y,
                type: character.characterType,
                id: character.id,
                name: character.name,
                hp: character.hp,
                score: character.score,
                direction: character.lastAngle,
            });

            this.knownObjIDs.push(character.id);
        }
        // for(var i in Character.list){
        //     let player = Character.list[i]
            
        //     //check distance:
        //     if(Math.abs(player.x - this.x) > loadDistance ||
        //        Math.abs(player.y - this.y) > loadDistance) continue;
            
        //     initPack.entities.push({
        //         x: player.x,
        //         y: player.y,
        //         type: "player",
        //         id: player.id,
        //         name: player.name,
        //         hp: player.hp,
        //         score: player.score,
        //         direction: player.lastAngle
        //     })

        //     this.knownObjIDs.push(player.id)
        // }

        //get pickups in load distance from character quadtree:
        let pickupsToLoad = Pickup.quadtree.retrieve(loadRect)

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
        let tilesToLoad = Tile.quadtree.retrieve(loadRect)

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
            name: `${Sounds.scale.base} ${Sounds.scale.type}`,
            allowedNotes: Sounds.scale.allowedNotes
        }
        initPack.bpm = Sounds.bpm;

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
            x: this.x - unloadDistance,
            y: this.y - unloadDistance,
            width: unloadDistance * 2,
            height: unloadDistance * 2
        }

        let charactersToUpdate = Character.quadtree.retrieve(loadRect)

        for(const c of charactersToUpdate){
            const character = Character.list[c.id];
            if(!this.isWithinDistance(character, loadDistance)) continue;

            if(character.needsUpdate || !this.knownObjIDs.includes(character.id)){
                this.updatePack.push({
                    x: character.x,
                    y: character.y,
                    type: character.characterType,
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

        // //Scheduled Bullets:
        // let scheduledBulletsToUpdate = ScheduledBullet.quadtree.retrieve(loadRect);
        // for(const sb of scheduledBulletsToUpdate){
        //     const scheduledBullet = ScheduledBullet.list[sb.id];
        //     if(!scheduledBullet) continue;
        //     if(!this.isWithinDistance(scheduledBullet, loadDistance)) continue;

        //     this.updatePack.push({
        //         x:
        //         y:
        //         id: 
        //         scheduledFor:

        //     })
        // }

        //Bullets:
        let bulletsToUpdate = Bullet.quadtree.retrieve(loadRect)

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


        let pickupsToUpdate = Pickup.quadtree.retrieve(loadRect)

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


        let tilesToUpdate = Tile.quadtree.retrieve(loadRect)

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
        //skip if player was not aware of object with given id:
        if(!this.knownObjIDs.includes(id)){
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
        let charactersNotToRemove = Character.quadtree.retrieve(unloadRect);
        for(const c of charactersNotToRemove){
            if(!this.isWithinDistance(c, unloadDistance)) continue;
            notToRemoveIDs.push(c.id);
        }

        for(let id in Character.list){
            const character = Character.list[id];
            if(!this.knownObjIDs.includes(character.id)) continue;
            if(notToRemoveIDs.includes(character.id)) continue;
            if(!this.isWithinDistance(character, unloadDistance)){
                this.addToRemovePack(character.id, character.characterType);
            }
        }

        //skip bullets (let them just be removed by timeout)

        //for pickups:
        let pickupsNotToRemove = Pickup.quadtree.retrieve(unloadRect);
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
        let tilesNotToRemove = Tile.quadtree.retrieve(unloadRect);
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

    die(byWho){
        super.die(byWho);

        this.updatePack.push({
            type: "death",
            killer: byWho.name
        })
    }
}