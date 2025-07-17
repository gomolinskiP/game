import { scheduledBullet } from "./Bullet.js";
import { scale } from "../socket.js";

export class Weapon{
    static chordNotes = ["onSpawn", "+4", "+7"]

    constructor(sound, duration, type, wielder, durationType){
        this.sound = sound;
        this.duration = duration;
        this.durationType = durationType;
        this.wielder = wielder;
        this.type = type;
        this.shootCount = 0;
    }

    shoot(note){
        switch(this.type){
            case 'normal':
                new scheduledBullet(this.wielder, "onSpawn", this.durationType)
                break;
            case 'random':
                let randNote = scale.allowedNotes[Math.floor(Math.random()*scale.allowedNotes.length)]
                new scheduledBullet(this.wielder, randNote, this.durationType)
                break;
            case 'chord':
                new scheduledBullet(this.wielder, "onSpawn", this.durationType)
                new scheduledBullet(this.wielder, "+4", this.durationType)
                new scheduledBullet(this.wielder, "+7", this.durationType)
                break;
            case 'arp-up':
                new scheduledBullet(this.wielder, this.getAscendingArpNote(this.shootCount, Weapon.chordNotes), this.durationType)
                this.shootCount += 1;
                break;
            case 'arp-down':
                new scheduledBullet(this.wielder, this.getDescendingArpNote(this.shootCount, Weapon.chordNotes), this.durationType)
                this.shootCount += 1;
                break;
            case 'arp-alt':
                new scheduledBullet(this.wielder, this.getAlternatingArpNote(this.shootCount, Weapon.chordNotes), this.durationType)
                
                this.shootCount += 1;
                break;
        }
        
    }

    getAscendingArpNote(count, notes){
        return notes[count % notes.length]
    }

    getDescendingArpNote(count, notes){
        const length = notes.length;

        return notes[length - 1 - count % length]
    }

    getAlternatingArpNote(count, notes){
        const length = notes.length;
        
        const cycleLen = 2*(length-1);
        const cyclePos = count % cycleLen

        let index;
        if(cyclePos < length) index = cyclePos;
        else index = cycleLen - cyclePos;

        return notes[index];
    }
}