import { Bullet } from "./Bullet.js";
import { Sounds } from "../musical/Sounds.js";
import { Character } from "./Character.js";

export class Weapon {
    static chordNotes = [0, 4, 7];
    static allowedDurations = ["1n.", "1n", "2n.", "2n", "4n.", "4n", "8n"];
    static allowedSounds = [
        "AMSynth",
        "DuoSynth",
        "FMSynth",
        "MembraneSynth",
        "MetalSynth",
        "MonoSynth",
        "PolySynth",
        "Synth",
    ];
    static allwedTypes = [
        "normal",
        // "random",
        "chord",
        "arp-up",
        "arp-down",
        "arp-alt",
    ];

    constructor(sound, duration, type, wielder) {
        this.sound = sound;
        this.wielder = wielder;
        this.damage = 250;

        this.rangeX = this.rangeY = undefined;

        this.setType(type);
        this.setDuration(duration);
    }

    change(requestedChange) {
        const type = requestedChange.type;
        const code = requestedChange.code;

        switch (type) {
            case "sound":
                this.setSound(code);
                this.wielder.toUpdate.selectedSound = this.sound;
                break;
            case "type":
                this.setType(code);
                this.wielder.toUpdate.weaponType = this.type;
                break;
            case "duration":
                this.wielder.updateShooterListOnDurationChange(this.duration, code);
                this.setDuration(code);
                this.wielder.toUpdate.duration = this.duration;
                break;
            default:
                console.log(
                    `unknown change type ${type} during requested weapon change`
                );
                break;
        }

        // this.wielder.needsUpdate = true;
    }

    setSound(sound) {
        this.sound = sound;

        // if (!this.wielder.updatePack) return;
        // this.wielder.updatePack.push({
        //     sound: this.sound,
        //     type: "weapon",
        // });
    }

    setType(type) {
        this.type = type;
        this.shootCount = 0;

        // if (!this.wielder.updatePack) return;
        // this.wielder.updatePack.push({
        //     weaponType: this.type,
        //     type: "weapon",
        // });
    }

    setDuration(duration) {
        this.duration = duration;

        this.shootCount = 0;

        this.updateRange();

        // if (!this.wielder.updatePack) return;
        // this.wielder.updatePack.push({
        //     duration: this.duration,
        //     type: "weapon",
        // });
    }

    updateRange(){
        const durationMs = Sounds.getTimeFromDuration(this.duration);
        this.rangeX = (durationMs / 25) * (10_000 / Sounds.beatInterval);
        this.rangeY = this.rangeX / 2;
        //magic numbers:
        //25 - ticks per second in server game loop
        //10_000 - a constant scaling the range
    }

    shoot(note) {
        const parent = this.wielder;
        const angle = this.wielder.lastAngle;
        const damage = this.damage;
        // const durationMs = this.durationMs;
        const duration = this.duration;

        //legacy - moved to destroying bullets by timeout or wall collision:
        // if(parent.characterType == 'bot'){
        //     parent.combatReward -= 1;
        // }

        switch (this.type) {
            case "normal":
                new Bullet(parent, angle, note, duration, damage);
                break;
            case "random":
                let randNote =
                    Sounds.scale.allowedNotes[
                        Math.floor(
                            Math.random() * Sounds.scale.allowedNotes.length
                        )
                    ];
                new Bullet(parent, angle, randNote, duration, damage);
                break;
            case "chord":
                new Bullet(parent, angle, note, duration, damage / 3);
                new Bullet(
                    parent,
                    angle,
                    Sounds.scale.getTransposed(note, 4),
                    duration,
                    damage / 3
                );
                new Bullet(
                    parent,
                    angle,
                    Sounds.scale.getTransposed(note, 7),
                    duration,
                    damage / 3
                );
                break;
            case "arp-up":
                new Bullet(
                    parent,
                    angle,
                    this.getAscendingArpNote(note, this.shootCount),
                    duration,
                    damage
                );
                this.shootCount += 1;
                break;
            case "arp-down":
                new Bullet(
                    parent,
                    angle,
                    this.getDescendingArpNote(note, this.shootCount),
                    duration,
                    damage
                );
                this.shootCount += 1;
                break;
            case "arp-alt":
                new Bullet(
                    parent,
                    angle,
                    this.getAlternatingArpNote(note, this.shootCount),
                    duration,
                    damage
                );
                this.shootCount += 1;
                break;
        }
    }

    getAscendingArpNote(note, count) {
        return Sounds.scale.getTransposed(
            note,
            Weapon.chordNotes[count % Weapon.chordNotes.length]
        );
        return notes[count % notes.length];
    }

    getDescendingArpNote(note, count) {
        const length = Weapon.chordNotes.length;
        return Sounds.scale.getTransposed(
            note,
            Weapon.chordNotes[length - 1 - (count % length)]
        );

        return notes[length - 1 - (count % length)];
    }

    getAlternatingArpNote(note, count) {
        const length = Weapon.chordNotes.length;

        const cycleLen = 2 * (length - 1);
        const cyclePos = count % cycleLen;

        let index;
        if (cyclePos < length) index = cyclePos;
        else index = cycleLen - cyclePos;

        return Sounds.scale.getTransposed(note, Weapon.chordNotes[index]);

        return notes[index];
    }
}

Character.shooterListInit();
