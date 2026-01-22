import { Sounds } from "../sounds.js";
import { SoundPool } from "../SoundPool.js";
import { Player } from "./C_Character.js";
import { Socket } from "../clientSocket.js";

const selfId = Socket.selfId;

export class BulletScheduler {
    constructor(parent, sound, duration, weaponType) {
        this.parentID = parent.id;
        // const duration = parent.selectedDuration;

        this.soundSlot = null;
        this.hasSoundSlot = false;

        this.shootCount = 0;

        let startOn;
        switch (duration) {
            case "1n.":
                startOn = "1:2:0";
                break;
            case "1n":
                startOn = "1:0:0";
                break;
            case "2n.":
                startOn = "0:3:0";
                break;
            case "2n":
                startOn = "0:2:0";
                break;
            case "4n.":
                startOn = "0:1:2";
                break;
            case "4n":
                startOn = "0:1:0";
                break;
            case "8n.":
                startOn = "0:0:3";
                break;
            case "8n":
                startOn = "0:0:2";
                break;
            default:
                console.warn("unknown duration", duration);
                return;
        }

        const noteID = parent.selectedNoteID;
        const note = Sounds.allowedNotes[noteID];
        const [note2ID, octUp2] = Sounds.getTransposedAllowedNoteID(noteID, 4);
        const [note3ID, octUp3] = Sounds.getTransposedAllowedNoteID(noteID, 7);
        //TODO use octUp!

        const note2 = Sounds.allowedNotes[note2ID];
        const note3 = Sounds.allowedNotes[note3ID];

        switch (weaponType) {
            case "normal":
                this.ID = Tone.Transport.scheduleRepeat(
                    (time) => {
                        new GhostBullet(parent, note, sound, duration);
                    },
                    duration,
                    startOn
                );
                break;
            case "chord":
                // console.log(
                //     'note1',
                //     note,
                //     'note2',
                //     note2,
                //     'note3',
                //     note3
                // )
                this.ID = Tone.Transport.scheduleRepeat(
                    (time) => {
                        //triad chord from 3 notes:
                        new GhostBullet(parent, note, sound, duration);
                        new GhostBullet(parent, note2, sound, duration);
                        new GhostBullet(parent, note3, sound, duration);
                    },
                    duration,
                    startOn
                );
                break;
            case "arp-up":
                this.ID = Tone.Transport.scheduleRepeat(
                    (time) => {
                        let notesIDs = [noteID, note2ID, note3ID];
                        let arpNoteID =
                            notesIDs[this.shootCount % notesIDs.length];
                        let arpNote = Sounds.allowedNotes[arpNoteID];
                        // console.log('asc arp note', arpNote)

                        //triad chord from 3 notes:
                        new GhostBullet(parent, arpNote, sound, duration);

                        this.shootCount++;
                    },
                    duration,
                    startOn
                );
                break;
            case "arp-down":
                this.ID = Tone.Transport.scheduleRepeat(
                    (time) => {
                        let notesIDs = [noteID, note2ID, note3ID];
                        let arpNoteID =
                            notesIDs[
                                notesIDs.length -
                                    1 -
                                    (this.shootCount % notesIDs.length)
                            ];
                        let arpNote = Sounds.allowedNotes[arpNoteID];
                        // console.log("desc arp note", arpNote);

                        //triad chord from 3 notes:
                        new GhostBullet(parent, arpNote, sound, duration);

                        this.shootCount++;
                    },
                    duration,
                    startOn
                );
                break;
            case "arp-alt":
                this.ID = Tone.Transport.scheduleRepeat(
                    (time) => {
                        let notesIDs = [noteID, note2ID, note3ID];

                        let cycleLen = 2 * (notesIDs.length - 1);
                        let cyclePos = this.shootCount % cycleLen;

                        let index;
                        if (cyclePos < notesIDs.length) index = cyclePos;
                        else index = cycleLen - cyclePos;

                        let arpNoteID = notesIDs[index];
                        let arpNote = Sounds.allowedNotes[arpNoteID];
                        // console.log("alt arp note", arpNote);

                        //triad chord from 3 notes:
                        new GhostBullet(parent, arpNote, sound, duration);

                        this.shootCount++;
                    },
                    duration,
                    startOn
                );
                break;
            default:
                console.warn(
                    "weapon type not supported for ghost bullet scheduling!"
                );
        }

        //weaponType: "normal":

        //weaponType: "chord" (triad chord):
    }

    remove() {
        if (this.soundSlot) {
            this.sampler.stop();
            this.soundSlot.free = true;
        }
        Tone.Transport.clear(this.ID);
    }
}

export class GhostBullet {
    //a bullet that is forecasted to appear, but has not been yet received from server-side:

    static listByID = {};

    constructor(parent, note, sound, duration) {
        this.x = parent.x;
        this.y = parent.y;

        if (parent.direction.includes("w")) this.x -= 20;
        if (parent.direction.includes("e")) this.x += 20;
        if (parent.direction.includes("n")) this.y -= 20;
        if (parent.direction.includes("s")) this.y += 20;

        this.creationTimestamp = Date.now();

        this.received = false;

        this.soundSlot = null;
        this.hasSoundSlot = false;

        this.soundSlot = SoundPool.globalSoundPool.getFree(parent.id, 10);

        if (this.soundSlot) {
            this.hasSoundSlot = true;
            this.soundSlot.sampler.samplePlayer.fadeIn = 0.01;
            this.soundSlot.occupierId = parent.id;

            this.pan3D = this.soundSlot.pan3D;
            this.pan3D.setPosition(
                (this.x - Player.list[selfId].x) * 0.1,
                0,
                (this.y - Player.list[selfId].y) * 0.1
            );

            this.sampler = this.soundSlot.sampler;
            this.sampler.setSound(sound);

            // const note = Sounds.allowedNotes[parent.selectedNoteID];
            this.sampler.play(note);
            // Sounds.test.triggerAttackRelease("C5", "32n");

            setTimeout(() => {
                delete GhostBullet.listByID[parent.id + note];
                if (this.received) return;
                this.sampler.stop();
                this.soundSlot.free = true;
            }, 250);

            GhostBullet.listByID[parent.id + note] = this;
        }
    }
}
