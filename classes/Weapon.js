import { scheduledBullet } from "./Bullet.js";
import { scale } from "../socket.js";

export class Weapon{
    static chordNotes = ["onSpawn", "+4", "+7"]

    constructor(sound, duration, type, wielder){
        this.sound = sound;
        this.duration = duration;
        this.wielder = wielder;
        this.type = type;
        this.shootCount = 0;
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
                break;
            case 'arp-up':
                console.log('arp-up')
                new scheduledBullet(this.wielder, this.getAscendingArpNote(this.shootCount, Weapon.chordNotes))
                this.shootCount += 1;
                break;
            case 'arp-down':
                console.log('arp-down')
                new scheduledBullet(this.wielder, this.getDescendingArpNote(this.shootCount, Weapon.chordNotes))
                this.shootCount += 1;
                break;
            case 'arp-alt':
                console.log('arp-alt')

                new scheduledBullet(this.wielder, this.getAlternatingArpNote(this.shootCount, Weapon.chordNotes))
                
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