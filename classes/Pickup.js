import { Entity } from './Entity.js';
import {removePack} from '../socket.js'
import { collisionLayer, checkWallCollision } from '../socket.js';


let soundList = ["AMSynth", "DuoSynth", "FMSynth", "MembraneSynth", "MetalSynth", "MonoSynth", "PolySynth", "Synth"]
let durationList = ["1n", "2n", "4n", "8n"] //TODO: add triplets "8t", add dotted notes "4n."
let typeList = ["normal", "random", "chord"]

export class Pickup extends Entity{
    static list = {};

    constructor(){
        let x;
        let y;

        let isUnreachable = true;
        while(isUnreachable){
            x = 1280 + 2000*(Math.random()-0.5);
            y = 450 + 1000*(Math.random()-0.5);
            isUnreachable = checkWallCollision(x, y, collisionLayer);
        }
        super(x, y)

        this.sound = soundList[Math.floor(Math.random() * soundList.length)]
        this.duration = durationList[Math.floor(Math.random() * durationList.length)]
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
        removePack.pickup.push(this.id)
        delete Pickup.list[this.id]
    }
}