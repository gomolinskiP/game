import { Socket } from "../Socket.js";
import { Bot } from "../game-objects/Bot.js";
import { Character } from "../game-objects/Character.js";
import { Scale } from "./Scale.js";

const MS_IN_MIN = 60000;

export class Sounds {
    static scale = new Scale("C", "major");
    static bpm = 90;
    static beatInterval = MS_IN_MIN / Sounds.bpm;

    static bpmChangePending = false;
    static targetBPM = this.bpm;
    static minBPM = 90;
    static maxBPM = 180;

    static startT;
    static tickNum = 0;

    static maxTimeInaccuracy = 150; //in ms
    static perfectTimeInaccuracy = 25; //in ms

    static lastDesiredT = -Sounds.beatInterval;

    static setBPM(bpm) {
        Sounds.bpm = bpm;
        Sounds.beatInterval = MS_IN_MIN / Sounds.bpm;

        // Sounds.startT = process.hrtime.bigint();
        // Sounds.tickNum = 0;
    }

    static setTargetBMP(targetBPM){
        Sounds.bpmChangePending = true;
        Sounds.targetBPM = targetBPM;
    }

    //TODO TOFIX changing bpm not good even on server!!
    static changeBPM(newBPM){
        // Sounds.startT = undefined;
        // Sounds.tickNum = 0;
        Sounds.bpm = newBPM;
        Sounds.beatInterval = MS_IN_MIN / Sounds.bpm;

        Socket.emitToAll("bpmChange", Sounds.bpm);
    }

    static metronomeTick() {
        if (!Sounds.startT) {
            Sounds.startT = process.hrtime.bigint();
        }

        const nowT = process.hrtime.bigint(); //ns
        const nowT_ms = Number(nowT / BigInt(1e6));
        const deltaT = nowT - Sounds.startT; //ns
        // const desiredT = Sounds.tickNum * Sounds.beatInterval; //ms
        const desiredT = Sounds.lastDesiredT + Sounds.beatInterval; //ms
        Sounds.lastDesiredT = desiredT;

        //compensate for clock drift:
        const compensateT = Number(deltaT / BigInt(1e6)) - desiredT;
        //next tick in compensated time
        const nextTickT = Math.max(0, Sounds.beatInterval - compensateT);

        const err = Number(
            (nowT - Sounds.startT) / BigInt(1e6) - BigInt(Math.round(desiredT))
        );

        // console.log(
        //     `tick: ${Sounds.tickNum} | t: ${
        //         (nowT - Sounds.startT) / BigInt(1e6)
        //     } ms | desiredT: ${desiredT} | err: ${
        //         (nowT - Sounds.startT) / BigInt(1e6) -
        //         BigInt(Math.round(desiredT))
        //     }`
        // );

        //emit metronome signal:
        Socket.emitToAll("tick", {
            tick: Sounds.tickNum,
            tickT: Date.now() - err,
        });

        Sounds.handleShots();

        //full bar:
        if (this.tickNum % 4 == 0) {
            //slowly change bpm
            if (this.bpmChangePending) {
                const changeDir = Math.sign(this.targetBPM - this.bpm);

                switch (changeDir) {
                    case 0:
                        this.bpmChangePending = false;
                        break;
                    case -1:
                        Sounds.changeBPM(Sounds.bpm - 1);
                        break;
                    case 1:
                        Sounds.changeBPM(Sounds.bpm + 1);
                        break;
                }
            }

            //random scale change:
            if (Math.random() > 0.9) {
                if (Math.random() > 0.5) {
                    Sounds.scale.changeToRelative();
                }

                if (Math.random() > 0.5) {
                    if (Math.random() > 0.5) {
                        Sounds.scale.changeToDominant();
                    } else {
                        Sounds.scale.changeToSubdominant();
                    }
                }
            }

            //random bpm change:
            if (
                Math.random() > 0.95 &&
                !Sounds.bpmChangePending &&
                this.tickNum % 64 == 0
            ) {
                //random new BPM is rounded to multiple of 5:
                const newBPM =
                    Sounds.minBPM +
                    Math.round(
                        (Math.random() * (Sounds.maxBPM - Sounds.minBPM)) / 5
                    ) *
                        5;

                Sounds.setTargetBMP(newBPM);
                console.log("change bpm to", newBPM);
            }
        }

        Sounds.tickNum++;

        setTimeout(() => {
            Sounds.metronomeTick();
        }, nextTickT);
    }

    static handleShots(){
        //handle shots:
        if (this.tickNum % 4 == 0) {
            //all 1n
            for (let ch of Character.shooterList["1n"]) {
                const note = Sounds.scale.allowedNotes[ch.selectedNoteID];
                ch.weapon.shoot(note);
            }
        }

        if (this.tickNum % 2 == 0) {
            //all 2n
            for (let ch of Character.shooterList["2n"]) {
                const note = Sounds.scale.allowedNotes[ch.selectedNoteID];
                ch.weapon.shoot(note);
            }
        }

        if (this.tickNum % 1 == 0) {
            //no need for condition - every tick:
            //all 4n
            for (let ch of Character.shooterList["4n"]) {
                const note = Sounds.scale.allowedNotes[ch.selectedNoteID];
                ch.weapon.shoot(note);
            }

            //all 8n + setTimeout after 1/2 beatInterval
            for (let ch of Character.shooterList["8n"]) {
                const note = Sounds.scale.allowedNotes[ch.selectedNoteID];

                ch.weapon.shoot(note);
                ch.outOfMetronomeSchedule = setTimeout(() => {
                    ch.weapon.shoot(note);
                }, Sounds.beatInterval / 2);
            }
        }

        if (this.tickNum % 6 == 0) {
            //all 1n. (dotted whole notes):
            for (let ch of Character.shooterList["1n."]) {
                const note = Sounds.scale.allowedNotes[ch.selectedNoteID];
                ch.weapon.shoot(note);
            }
        }

        if (this.tickNum % 3 == 0) {
            //all 2n. (dotted half notes):
            for (let ch of Character.shooterList["2n."]) {
                const note = Sounds.scale.allowedNotes[ch.selectedNoteID];
                ch.weapon.shoot(note);
            }
        }

        //4n. (dotted quarter notes):
        if (this.tickNum % 3 == 0) {
            for (let ch of Character.shooterList["4n."]) {
                const note = Sounds.scale.allowedNotes[ch.selectedNoteID];
                ch.weapon.shoot(note);

                //also shoot after 3/2 of beat:
                ch.outOfMetronomeSchedule = setTimeout(() => {
                    ch.weapon.shoot(note);
                }, Sounds.beatInterval * (3 / 2));
            }
        }
    }

    static getNoteSpawnTime(noteDuration) {
        const creationTimeNs = process.hrtime.bigint() - Sounds.startT; //server tempo time (in ns) that the shot was fired
        const lastTickT = (Sounds.tickNum - 1) * Sounds.beatInterval; //server tempo time (in ms) of the last metronome tick
        const timeDif = Number(creationTimeNs / BigInt(1e6)) - lastTickT; //time after last metronome tick (in ms) that the shot was fired

        let spawnInT; //how many milliseconds in the future should the bullet actually spawn to be in tempo
        switch (noteDuration) {
            case "1n":
                spawnInT =
                    (4 - ((Sounds.tickNum - 1) % 4)) * Sounds.beatInterval -
                    timeDif;
                break;
            case "2n":
                spawnInT =
                    (2 - ((Sounds.tickNum - 1) % 2)) * Sounds.beatInterval -
                    timeDif;
                break;
            case "4n":
                spawnInT = Sounds.beatInterval - timeDif;
                break;
            case "8n":
                if (timeDif > Sounds.beatInterval / 2) {
                    spawnInT = Sounds.beatInterval - timeDif;
                } else {
                    spawnInT = Sounds.beatInterval / 2 - timeDif;
                }
                break;
            case "1n.":
                spawnInT =
                    (6 - ((Sounds.tickNum - 1) % 6)) * Sounds.beatInterval -
                    timeDif;
                break;
            case "2n.":
                spawnInT =
                    (3 - ((Sounds.tickNum - 1) % 3)) * Sounds.beatInterval -
                    timeDif;
                break;
            case "4n.":
                let quarterInCycle = (Sounds.tickNum - 1) % 3;
                switch (quarterInCycle) {
                    case 0:
                        spawnInT = (3 * Sounds.beatInterval) / 2 - timeDif;
                        break;
                    case 1:
                        if (timeDif > Sounds.beatInterval / 2) {
                            spawnInT = 2 * Sounds.beatInterval - timeDif;
                        } else {
                            spawnInT = Sounds.beatInterval / 2 - timeDif;
                        }
                        break;
                    case 2:
                        spawnInT = Sounds.beatInterval - timeDif;
                        break;
                }
                break;
        }
        return spawnInT;
    }

    static getTimeFromDuration(noteDuration) {
        let noteDurationType;
        if(noteDuration.includes(".")){
            noteDurationType = "dotted";
        }
        else{
            noteDurationType = "normal";
        }


        let timeMs;
        let durationInt = parseInt(
            noteDuration.replace("n", "").replace(".", "")
        );
        switch (noteDurationType) {
            case "normal":
                timeMs = Sounds.beatInterval * (4 / durationInt);
                break;
            case "dotted":
                timeMs = (Sounds.beatInterval * (4 / durationInt) * 3) / 2;
                break;
        }

        return timeMs;
    }

    static evaluateNoteTimingAccuracy(noteDuration, noteDurationType) {
        const spawnInT = Sounds.getNoteSpawnTime(noteDuration); //in how many milliseconds should the bullet spawn
        const durationInMs = Sounds.getTimeFromDuration(noteDuration);
        const maxTimeInaccuracy = Math.max(100, durationInMs / 10); //max number of milliseconds of innacuracy allowed

        let timeInaccuracy;
        if (spawnInT > durationInMs / 2) {
            // if the time to perfect timing is larger than half of the duration, we assume the shot was meant for the PREVIOUS perfect time
            // therefore we calculate the inaccuracy as if player was LATE - time inaccuracy is more than 0

            timeInaccuracy = durationInMs - spawnInT;
        } else {
            // if not, we assume the player was earlier than the perfect time
            // EARLY - time inaccuracy is less than 0

            timeInaccuracy = -spawnInT;
        }

        return timeInaccuracy;

        // if (spawnInT > durationInMs - maxTimeInaccuracy) {
        //     //|-S-M----------| spawnInT (S) is big enough (close to durationInMs) that we assume it was meant for the previous "perfect time",
        //     //                  therefore if it is late not more than maxTimeInaccuracy, we allow it and spawn it immediately.
        //     //                  Player shot (durationInMs - spawnInT) milliseconds to late.
        //     timeInaccuracy = durationInMs - spawnInT;

        //     //player is late by no more than max innacuracy - spawn immediately
        //     this.spawn();

        //     setTimeout(() => {
        //         this.parent.hasShotScheduled = false;
        //     }, this.durationInMs - this.maxTimeInaccuracy);
        // } else if (spawnInT > maxTimeInaccuracy) {
        //     //|--------S--M---|
        //     // player tried to shoot to early - spawnInT is bigger than maxTimeInnacuracy
        //     timeInaccuracy = -spawnInT; //negative value to signalize that the shot was to early

        //     //player is too early;
        //     this.cancel();
        // } else {
        //     //player early but within max inaccuracy:
        //     setTimeout(() => {
        //         this.spawn();
        //     }, spawnInT);

        //     setTimeout(() => {
        //         this.parent.hasShotScheduled = false;
        //     }, durationInMs - maxTimeInaccuracy);
        // }
    }

    static evaluateNoteTimingAccuracy2(shootT){
        //TODO:
        const utcT = Date.now();
        const delay = utcT - shootT;

        const nowT_ns = process.hrtime.bigint(); //ns
        const deltaT_ns = nowT_ns - Sounds.startT; //ns
        const deltaT_ms = Number(deltaT_ns / BigInt(1e6));

        //times from startT:
        const lastTickT = Sounds.lastDesiredT;
        const nextTickT = lastTickT + Sounds.beatInterval;

        const errFromLast = deltaT_ms - lastTickT - delay;
        const errToNext = nextTickT - deltaT_ms + delay;

        

        console.log(
            "t from last tick",
            errFromLast,
            "t to next tick",
            errToNext,
            "delay:",
            delay
        );
    }
}
