import { Entity } from './Entity.js';
import { Character } from './Character.js';
import { Player } from './Player.js';
import { Map } from '../Map.js';
import { Tile } from './Tile.js';
import Quadtree from "@timohausmann/quadtree-js";


let soundList = ["AMSynth", "DuoSynth", "FMSynth", "MembraneSynth", "MetalSynth", "MonoSynth", "PolySynth", "Synth"]
let durationList = ["1n", "2n", "4n", "8n", "1n.", "2n.", "4n."] //TODO: add triplets "8t", add dotted notes "4n."
let typeList = ["normal", "random", "chord", "arp-up", "arp-down", "arp-alt"]
// let typeList = ["arp-alt"]


export class Pickup extends Entity{
    static list = {};
    static quadtree;

    static createQuadtree(rect){
        Pickup.quadtree = new Quadtree(rect);
    }

    static refreshQuadtree(){
        Pickup.quadtree.clear();

        for (let id in Pickup.list) {
            const pickup = Pickup.list[id];
            Pickup.quadtree.insert({
                x: pickup.x - 4,
                y: pickup.y - 4,
                width: 8,
                height: 8,
                id: id,
            });
        }
    }

    static randomSpawn(){
        // random pickup spawn:
        if (
            Math.random() < 0.1 &&
            Object.keys(Pickup.list).length < Number(process.env.PICKUP_NUM)
        ) {
            // console.log("pickup spawned")
            new Pickup();
        }
    }

    constructor(){
        let x;
        let y;

        let isUnreachable = true;
        while(isUnreachable){
            x = Map.boundRect.x + Map.boundRect.width*(Math.random());
            y = Map.boundRect.y + Map.boundRect.height*(Math.random());

            //check if pickup will be reachable (on floor and not inside a wall)
            isUnreachable = Tile.checkTilesCollision(x, y, Tile.wallQTree) || !Tile.checkTilesCollision(x, y, Tile.floorQTree)
        }
        super(x, y)
        this.entityType = "pickup";

        this.sound = soundList[Math.floor(Math.random() * soundList.length)]
        this.duration = durationList[Math.floor(Math.random() * durationList.length)]
        // determine note duration type: normal, dotted or triplet?
        if(this.duration.includes(".")) this.durationType = "dotted";
        else this.durationType = "normal";

        this.type = typeList[Math.floor(Math.random() * typeList.length)]


        this.id = Math.random();

        this.needsUpdate = true;
        

        Pickup.list[this.id] = this
        this.timeout = setTimeout(()=>{
            // delete itself after timeout:
            this.destroy();
        }, 30000)

        return this;
    }

    destroy(){
        clearTimeout(this.timeout)
        //add to remove pack for all players:
        for(let i in Player.list){
            let player = Player.list[i]
            player.addToRemovePack(this.id, "pickup");
        }
        delete Pickup.list[this.id]
    }

    checkPicked(){
        let characterID = this.collidingPlayerId(Character.list, Character.quadtree)

        if(characterID != null){
            const character = Character.list[characterID];

            character.giveWeapon(this.sound, this.duration, this.type);
            character.addScore(1);

            if(character.characterType == "bot"){
                character.pickupsReward += 10;
                character.stepsSinceLastPickup = 0;
                // console.log(`giving 10 reward for pickup`);
            }
            this.destroy();
        }
    }

    static handleAll(){
        for(let i in Pickup.list){
            let pickup = Pickup.list[i]

            pickup.checkPicked();
        }
    }
}