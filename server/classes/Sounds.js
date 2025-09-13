import { Socket } from "./Socket.js";
import { Bot } from "./Bot.js";
import { Scale } from "./Scale.js";

export class Sounds {
    static scale = new Scale("C", "minor");
    static bpm = 120;
    static beatInterval = 60000 / Sounds.bpm;

    static startT;
    static tickNum = 0;

    static maxTimeInaccuracy = 150; //in ms
    static perfectTimeInaccuracy = 25; //in ms

    static setBPM(bpm) {
        Sounds.bpm = bpm;
        Sounds.beatInterval = 60000 / Sounds.bpm;

        Sounds.startT = process.hrtime.bigint();
        Sounds.tickNum = 0;
    }
    

    static metronomeTick() {
        if (!Sounds.startT) {
            Sounds.startT = process.hrtime.bigint();
        }

        const nowT = process.hrtime.bigint(); //ns
        const deltaT = nowT - Sounds.startT; //ns
        const desiredT = Sounds.tickNum * Sounds.beatInterval; //ms

        //compensate for clock drift:
        const compensateT = Number(deltaT / BigInt(1e6)) - desiredT;
        //next tick in compensated time
        const nextTickT = Math.max(0, Sounds.beatInterval - compensateT);

        // console.log(`tick: ${Sounds.tickNum} | t: ${(nowT - startT)/BigInt(1e6)} ms | desiredT: ${desiredT} | err: ${(nowT - startT)/BigInt(1e6) - BigInt(desiredT)}`)

        //emit metronome signal:
        Socket.emitToAll("tick2", {
            tick: Sounds.tickNum,
            serverTime: Date.now(),
        });

        Bot.metronomeTick();

        Sounds.tickNum++;

        if (Math.random() > 0.99) {
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

        setTimeout(() => {
            Sounds.metronomeTick();
        }, nextTickT);
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

    static getTimeFromDuration(noteDuration, noteDurationType) {
        let timeMs;

        let durationInt = parseInt(
            noteDuration.replace("n", "").replace(".", "")
        );
        switch (noteDurationType) {
            case "normal":
                timeMs = (60000 / 120) * (4 / durationInt);
                break;
            case "dotted":
                timeMs = ((60000 / 120) * (4 / durationInt) * 3) / 2;
                break;
        }

        return timeMs;
    }

    static evaluateNoteTimingAccuracy(noteDuration, noteDurationType) {
        const spawnInT = Sounds.getNoteSpawnTime(noteDuration); //in how many milliseconds should the bullet spawn
        const durationInMs = Sounds.getTimeFromDuration(
            noteDuration,
            noteDurationType
        );
        const maxTimeInaccuracy = Math.max(100, durationInMs / 10); //max number of milliseconds of innacuracy allowed

        
        let timeInaccuracy;
        if(spawnInT > durationInMs/2){
            // if the time to perfect timing is larger than half of the duration, we assume the shot was meant for the PREVIOUS perfect time
            // therefore we calculate the inaccuracy as if player was LATE - time inaccuracy is more than 0

            timeInaccuracy = durationInMs - spawnInT;
        }
        else{
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
}
