import { Entity } from './Entity.js';
import { Player } from './Player.js';
import { collisionLayer, checkWallCollision } from '../socket.js';


let soundList = ["AMSynth", "DuoSynth", "FMSynth", "MembraneSynth", "MetalSynth", "MonoSynth", "PolySynth", "Synth"]
let durationList = ["1n", "2n", "4n", "8n", "1n.", "2n.", "4n."] //TODO: add triplets "8t", add dotted notes "4n."
let typeList = ["normal", "random", "chord", "arp-up", "arp-down", "arp-alt"]
// let typeList = ["arp-alt"]


export class Pickup extends Entity{
    static list = {};

    constructor(){
        let x;
        let y;

        let isUnreachable = true;
        while(isUnreachable){
            x = 0 + 2000*(Math.random()-0.5);
            y = 0 + 1000*(Math.random()-0.5);
            isUnreachable = checkWallCollision(x, y, collisionLayer);
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
            // delete itself after timeout??
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

    checkPicked(playerList, socketList){
        let playerId = this.collidingPlayerId()

        if(playerId != null){
            playerList[playerId].giveWeapon(this.sound, this.duration, this.type, this.durationType)
            socketList[playerId].emit('new weapon', {type: this.type, duration: this.duration});
            this.destroy();
        }
    }

    static handleAll(playerList, socketList){
        for(let i in Pickup.list){
            let pickup = Pickup.list[i]

            pickup.checkPicked(playerList, socketList);
        }
    }
}