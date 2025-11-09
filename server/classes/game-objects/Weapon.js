import { Bullet } from "./Bullet.js";
import { Sounds } from "../musical/Sounds.js";

export class Weapon {
    static chordNotes = [0, 4, 7];
    static allowedDurations = ["1n", "1n.", "2n", "2n.", "4n", "4n.", "8n"];
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
        "random",
        "chord",
        "arp-up",
        "arp-down",
        "arp-alt",
    ];

    constructor(sound, duration, type, wielder) {
        this.sound = sound;
        this.wielder = wielder;
        this.damage = 250;

        this.setType(type);
        this.setDuration(duration);
    }

    change(requestedChange) {
        const type = requestedChange.type;
        const code = requestedChange.code;

        switch (type) {
            case "sound":
                this.setSound(code);
                break;
            case "type":
                this.setType(code);
                break;
            case "duration":
                this.setDuration(code);
                break;
            default:
                console.log(
                    `unknown change type ${type} during requested weapon change`
                );
                break;
        }
    }

    setSound(sound) {
        this.sound = sound;

        if (!this.wielder.updatePack) return;
        this.wielder.updatePack.push({
            sound: this.sound,
            type: "weapon",
        });
    }

    setType(type) {
        this.type = type;
        this.shootCount = 0;

        if (!this.wielder.updatePack) return;
        this.wielder.updatePack.push({
            weaponType: this.type,
            type: "weapon",
        });
    }

    setDuration(duration) {
        this.duration = duration;

        // determine note duration type: normal, dotted or triplet (triplets not yet implemented)?
        if (this.duration.includes(".")) this.durationType = "dotted";
        else this.durationType = "normal";

        this.durationMs = Sounds.getTimeFromDuration(
            this.duration,
            this.durationType
        );

        const durationInt = parseInt(
            duration.replace("n", "").replace(".", "")
        );
        this.durationInt = durationInt;
        //update weapon damage depending on duration:
        // switch (this.durationType) {
        //     case "normal":
        //         this.damage = 250 / durationInt;
        //         break;
        //     case "dotted":
        //         this.damage = ((3 / 2) * 250) / durationInt;
        //         break;
        //     default:
        //         this.damage = 1;
        //         console.warn("Unsupported duration type while setting new duration: ", duration);
        //         break;
        // }

        this.shootCount = 0;

        if (!this.wielder.updatePack) return;
        this.wielder.updatePack.push({
            duration: this.duration,
            type: "weapon",
        });
    }

    shoot(note) {
        const parent = this.wielder;
        const angle = this.wielder.lastAngle;
        const damage = this.damage;
        const durationMs = this.durationMs;

        if(parent.characterType == 'bot'){
            parent.combatReward -= 5;
        }

        switch (this.type) {
            case "normal":
                new Bullet(parent, angle, note, durationMs, damage);
                break;
            case "random":
                let randNote =
                    Sounds.scale.allowedNotes[
                        Math.floor(
                            Math.random() * Sounds.scale.allowedNotes.length
                        )
                    ];
                new Bullet(parent, angle, randNote, durationMs, damage);
                break;
            case "chord":
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
            case "arp-up":
                new Bullet(
                    parent,
                    angle,
                    this.getAscendingArpNote(note, this.shootCount),
                    this.durationMs,
                    damage
                );
                this.shootCount += 1;
                break;
            case "arp-down":
                new Bullet(
                    parent,
                    angle,
                    this.getDescendingArpNote(note, this.shootCount),
                    durationMs,
                    damage
                );
                this.shootCount += 1;
                break;
            case "arp-alt":
                new Bullet(
                    parent,
                    angle,
                    this.getAlternatingArpNote(note, this.shootCount),
                    durationMs,
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