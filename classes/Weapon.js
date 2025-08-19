import { scheduledBullet } from "./Bullet.js";
import { scale } from "../socket.js";

export class Weapon{
    static chordNotes = ["onSpawn", "+4", "+7"]

    constructor(sound, duration, type, wielder){
        this.sound = sound;
        this.wielder = wielder;
        
        this.setType(type);
        this.setDuration(duration)
    }

    change(requestedChange){
        const type = requestedChange.type;
        const code = requestedChange.code;

        switch(type){
            case 'sound':
                this.setSound(code);
                break;
            case 'type':
                this.setType(code);
                break;
            case 'duration':
                this.setDuration(code);
                break;
            default:
                console.log(`unknown change type ${type} during requested weapon change`);
                break;
        }
    }

    setSound(sound){
        this.sound = sound;

        if(!this.wielder.updatePack) return;
        this.wielder.updatePack.push({
            sound: this.sound,
            type: "weapon",
        })
    }

    setType(type){
        this.type = type;
        this.shootCount = 0;

        if(!this.wielder.updatePack) return;
        this.wielder.updatePack.push({
            weaponType: this.type,
            type: "weapon",
        })
    }

    setDuration(duration){
        this.duration = duration;

        // determine note duration type: normal, dotted or triplet?
        if(this.duration.includes(".")) this.durationType = "dotted";
        else this.durationType = "normal";

        const durationInt = parseInt(duration.replace("n", "").replace(".", ""))
        //update weapon damage depending on duration:
        switch(this.durationType){
            case "normal":
                this.damage = 200/durationInt;
                this.wielder.shootTimeoutTime = 60000/120 * (4/durationInt);
                break;
            case "dotted":
                this.damage = (3/2)*200/durationInt;
                this.wielder.shootTimeoutTime = 60000/120 * (4/durationInt) * 3/2
                break;
            default:
                this.damage = 1;
                break;
        }

        this.shootCount = 0;

        if(!this.wielder.updatePack) return;
        this.wielder.updatePack.push({
            duration: this.duration,
            type: "weapon",
        })
    }

    shoot(note){
        switch(this.type){
            case 'normal':
                new scheduledBullet(this.wielder, "onSpawn", this.durationType, this.damage)
                break;
            case 'random':
                let randNote = scale.allowedNotes[Math.floor(Math.random()*scale.allowedNotes.length)]
                new scheduledBullet(this.wielder, randNote, this.durationType, this.damage)
                break;
            case 'chord':
                new scheduledBullet(this.wielder, "onSpawn", this.durationType, this.damage/3)
                new scheduledBullet(this.wielder, "+4", this.durationType, this.damage/3)
                new scheduledBullet(this.wielder, "+7", this.durationType, this.damage/3)
                break;
            case 'arp-up':
                new scheduledBullet(this.wielder, this.getAscendingArpNote(this.shootCount, Weapon.chordNotes), this.durationType, this.damage)
                this.shootCount += 1;
                break;
            case 'arp-down':
                new scheduledBullet(this.wielder, this.getDescendingArpNote(this.shootCount, Weapon.chordNotes), this.durationType, this.damage)
                this.shootCount += 1;
                break;
            case 'arp-alt':
                new scheduledBullet(this.wielder, this.getAlternatingArpNote(this.shootCount, Weapon.chordNotes), this.durationType, this.damage)
                
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