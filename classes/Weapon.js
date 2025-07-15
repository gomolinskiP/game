import { scheduledBullet } from "./Bullet.js";
import { scale } from "../socket.js";

export class Weapon{
    constructor(sound, duration, type, wielder){
        this.sound = sound;
        this.duration = duration;
        this.wielder = wielder;
        this.type = type;
    }

    shoot(note){
        switch(this.type){
            case 'normal':
                new scheduledBullet(this.wielder)
                break;
            case 'random':
                let randNote = scale.allowedNotes[Math.floor(Math.random()*scale.allowedNotes.length)]
                new scheduledBullet(this.wielder, randNote)
                break;
            case 'chord':
                new scheduledBullet(this.wielder)
                new scheduledBullet(this.wielder, "+4")
                new scheduledBullet(this.wielder, "+7")
                console.log('chord')

                break;
        }
        
    }
}