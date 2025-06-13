import { Entity } from './Entity.js';
import {removePack} from '../socket.js'


let soundList = ["AMSynth", "DuoSynth", "FMSynth", "MembraneSynth", "MetalSynth", "MonoSynth", "PolySynth", "Synth"]

export class Pickup extends Entity{
    static list = {};

    constructor(){
        let x = 2000*(Math.random())
        let y = 1000*(Math.random())
        super(x, y)

        this.sound = soundList[Math.round(Math.random() * soundList.length)]
        this.duration = "2n"

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