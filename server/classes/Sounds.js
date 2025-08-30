import { Socket } from "./Socket.js";
import { Scale } from "./Scale.js";

export class Sounds {
    static scale = new Scale("C", "minor");
    static bpm = 120;
    static beatInterval = 60000 / Sounds.bpm;

    static startT;
    static tickNum = 0;

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

        Sounds.tickNum++;

        if (Math.random() > 0.99) {
            if (Math.random() > 0.5) {
                console.log(`change to relative?`);
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
}
