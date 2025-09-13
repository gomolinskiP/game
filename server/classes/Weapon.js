import { Bullet } from "./Bullet.js";
import { Sounds } from "./Sounds.js";

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

        // determine note duration type: normal, dotted or triplet (triplets not yet implemented)?
        if(this.duration.includes(".")) this.durationType = "dotted";
        else this.durationType = "normal";

        this.durationMs = Sounds.getTimeFromDuration(this.duration, this.durationType);

        const durationInt = parseInt(duration.replace("n", "").replace(".", ""))
        this.durationInt = durationInt;
        //update weapon damage depending on duration:
        switch(this.durationType){
            case "normal":
                this.damage = 200/durationInt;
                break;
            case "dotted":
                this.damage = (3/2)*200/durationInt;
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
        const parent = this.wielder;
        const angle = this.wielder.lastAngle;
        const damage = this.damage;
        const durationMs = this.durationMs;

        switch(this.type){
            case 'normal':
                new Bullet(parent, angle, note, durationMs, damage)
                break;
            case 'random':
                let randNote = Sounds.scale.allowedNotes[Math.floor(Math.random()*Sounds.scale.allowedNotes.length)]
                new Bullet(parent, angle, randNote, durationMs, damage);
                break;
            case 'chord':
                new Bullet(parent, angle, note, durationMs, damage / 3);
                new Bullet(
                    parent,
                    angle,
                    Sounds.scale.getTransposed(note, 4),
                    durationMs,
                    damage / 3
                );
                new Bullet(
                    parent,
                    angle,
                    Sounds.scale.getTransposed(note, 7),
                    durationMs,
                    damage / 3
                );
                break;
            case 'arp-up':
                new Bullet(parent,  angle, this.getAscendingArpNote(this.shootCount, Weapon.chordNotes), this.durationMs, damage)
                this.shootCount += 1;
                break;
            case 'arp-down':
                new Bullet(
                    parent,
                    angle,
                    this.getDescendingArpNote(
                        this.shootCount,
                        Weapon.chordNotes
                    ),
                    durationMs,
                    damage
                );
                this.shootCount += 1;
                break;
            case 'arp-alt':
                new Bullet(
                    parent,
                    angle,
                    this.getAlternatingArpNote(
                        this.shootCount,
                        Weapon.chordNotes
                    ),
                    durationMs,
                    damage
                );
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