import { Socket } from "./clientSocket.js";
import { GameUI } from "./gameButtons.js";
import { Keyboard } from "./keyboard.js";

const MS_IN_MIN = 60000;

export class Sounds {
    static limiter = new Tone.Compressor(-0.1, 20);
    static reverb = new Tone.Reverb({
        decay: 5,
        preDelay: 0,
        wet: 0.6,
    });

    static connectToMaster() {
        Sounds.limiter.connect(Sounds.reverb);
        Sounds.reverb.toDestination();
    }

    static metronome = new Tone.Synth();
    static metrVol = new Tone.Volume(-26);

    static test = new Tone.Synth();

    static metronomeInit() {
        Sounds.metronome.chain(Sounds.metrVol, Sounds.reverb, Tone.Destination);

        Sounds.test.chain(Sounds.metrVol, Sounds.reverb, Tone.Destination);

        Tone.Transport.scheduleRepeat((time) => {
            Sounds.test.triggerAttackRelease("C5", "32n", time);
        }, "16n");

        Tone.Transport.scheduleRepeat((time) => {
            // if (Socket) Socket.noteFire("C");
            const [bar, beat, subbeat] = Tone.Transport.position
                .split(":")
                .map(Number);
            const subbeatsInBeat = 4;
            const roundedBeat = beat + Math.round(subbeat / subbeatsInBeat);

            let octave;
            let metronomeHighlight;
            if (roundedBeat % 4 == 0) {
                octave = 6;
                metronomeHighlight = "green";
            } else {
                octave = 5;
                metronomeHighlight = "red";
            }

            GameUI.highlightMetronome(metronomeHighlight);

            const note = `${Sounds.scaleBase}${octave}`;

            // console.log(`metronome: ${Tone.Transport.position} tick: ${tickNum}`);
            if (
                Sounds.audioOn &&
                Sounds.metronomeSoundOn &&
                Tone.context.state == "running"
            )
                Sounds.metronome.triggerAttackRelease(note, "32n", time);
        }, "4n");
    }

    static bpm;
    static timeSig = 4;
    static beatInterval;
    static scaleName;
    static scaleBase;
    static allowedNotes;
    static notes = [
        "C",
        "C#",
        "D",
        "D#",
        "E",
        "F",
        "F#",
        "G",
        "G#",
        "A",
        "A#",
        "B",
    ];

    static audioOn = true;
    static metronomeSoundOn = false;

    static setScale(scaleName, allowedNotes) {
        Sounds.scaleName = scaleName;
        Sounds.scaleBase = scaleName[0];
        Sounds.allowedNotes = allowedNotes;
        GameUI.setScaleLabel(scaleName);
        GameUI.reorderKeyboardKeys(allowedNotes[0]);
        GameUI.disableDisallowedNoteKeys(allowedNotes);
    }

    static setBPM(bpm) {
        this.bpm = bpm;
        Tone.Transport.timeSignature = Sounds.timeSig;
        Tone.Transport.bpm.value = this.bpm;

        this.beatInterval = MS_IN_MIN / this.bpm;
        // this.tickNum = 0;

        GameUI.setBPMLabel(bpm);
    }

    static firstTickNum;
    static tickNum;

    static handleMetronomeTick(data) {
        //cannot start transport until audio context is running:
        if (Tone.context.state !== "running") return;

        Sounds.tickNum = data.tick;
        const clientTime = Date.now();
        const serverTime = data.tickT - ClockSync.offset;

        const timeDelay_ms = clientTime - serverTime; //in ms

        if (!Sounds.firstTickNum) {
            //metronome not started yet:
            if (Sounds.tickNum % 4 != 0) return; //want to start on first beat
            Sounds.firstTickNum = Sounds.tickNum;
            const timeDelay_s = timeDelay_ms / 1000;
            console.log(`starting transport | tickNum: ${Sounds.tickNum}`);
            Tone.Transport.start("+0", -timeDelay_s);
        } else {
            //metronome already started:
            const localTickNum = Sounds.tickNum - Sounds.firstTickNum;

            const desiredDeltaT_ms =
                localTickNum * Sounds.beatInterval + timeDelay_ms;

            Sounds.fixTransport(desiredDeltaT_ms);

            // console.log(`tickN: ${localTickNum} | tickDelay ${timeDelay} | deltaT: ${deltaT} | desiredDeltaT_ms: ${desiredDeltaT_ms} | err ${err}`);
            // console.log(Tone.Transport.seconds, Tone.Transport.position, `${Math.round(Tone.Transport.seconds*1000 - desiredDeltaT_ms)}`)
        }
    }

    static acceptableError_ms = 5;

    static fixTransport(desired_ms) {
        const baseBPM = Sounds.bpm;

        const desiredSeconds = desired_ms / 1000;
        const desiredPosition = Sounds.secondsToPosition(desiredSeconds);

        const tPosition = Tone.Transport.position;

        const error =
            Sounds.positionToSeconds(desiredPosition) -
            Sounds.positionToSeconds(tPosition);

        console.log("fixTransport error", Math.round(error * 1000));

        // console.log(`desiredPos: ${desiredPosition}, tPos: ${tPosition} ${Tone.Transport.position} | errT:${error}`)

        const acceptableError_s = Sounds.acceptableError_ms / 1000;
        if (Math.abs(error) < acceptableError_s) {
            Tone.Transport.bpm.value = baseBPM;
            return;
        }

        const correction = Math.max(0.9, Math.min(1.1, 1 + error * 0.5));

        Tone.Transport.bpm.value = baseBPM * correction;

        // console.log("setBPM:", Sounds.bpm, "transportBPM:", Tone.Transport.bpm.value,"errorMS:", Math.round(error*1000), "correctionScaler:", correction);
        // console.log(`bpm correction: ${Tone.Transport.bpm.value}`)
    }

    static positionToSeconds(position) {
        const beatsPerBar = 4;
        const bpm = Sounds.bpm;
        const [bars, beats, sixteenths] = position.split(":").map(Number);
        const beatSec = 60 / bpm;
        const totalBeats = bars * beatsPerBar + beats + sixteenths / 4;
        return totalBeats * beatSec;
    }

    static secondsToPosition(seconds) {
        const beatSec = 60 / Sounds.bpm;
        const totalBeats = seconds / beatSec;

        const beatsPerBar = 4; // eg. 4/4
        const bars = Math.floor(totalBeats / beatsPerBar);
        const beatInBar = Math.floor(totalBeats % beatsPerBar);

        const sixteenthSec = beatSec / 4; // 1 beat = 4 sixteens
        const sixteenths = ((seconds % beatSec) / sixteenthSec).toFixed(3);

        const position = `${bars}:${beatInBar}:${sixteenths}`;
        return position;
    }

    static setupNoteKeyboard() {
        let digit = 1;
        for (const note of Sounds.allowedNotes) {
            // console.log(`allowed note ${note}`);
            Keyboard.addNoteKeyboardListener(digit);

            digit++;
        }
    }

    static toneDurationToMs(duration) {
        let durationType;
        if (duration.includes(".")) {
            durationType = "dotted";
        } else {
            durationType = "normal";
        }

        let timeMs =
            (60000 / Sounds.bpm) * (4 / parseInt(duration.replace("n", "")));

        if (durationType == "dotted") {
            timeMs = timeMs * (3 / 2);
        }

        return timeMs;
    }
}

Sounds.connectToMaster();
Sounds.metronomeInit();

export class ClockSync {
    static rtt = 0;
    static delay = 0;
    static offset = 0;
    static buffer = [];
    static bufferLength = 8;
    static lowestDelayIndex;

    static addToBuffer(offset, delay) {
        if (this.buffer.length >= this.bufferLength) this.buffer.shift();

        this.buffer.push({
            offset: offset,
            delay: delay,
        });

        console.log(
            "offset",
            offset,
            "delay",
            delay,
            "buffer",
            JSON.stringify(this.buffer)
        );
        this.computeOffset();
    }

    static computeOffset() {
        const bestByDelay = [...this.buffer]
            .sort((a, b) => a.delay - b.delay)
            .slice(0, 5);
        const offsets = bestByDelay.map((s) => s.offset);
        const delays = bestByDelay.map((s) => s.delay);

        //median:
        const mid = Math.floor(offsets.length / 2);
        const offsetMedian =
            offsets.length % 2 !== 0
                ? offsets[mid]
                : (offsets[mid - 1] + offsets[mid]) / 2;

        //slowly change global client offset:
        this.offset = this.offset * 0.6 + offsetMedian * 0.4;

        console.log(
            "bestByDelay",
            JSON.stringify(bestByDelay),
            "offsetMedian",
            offsetMedian,
            "globalOffset",
            this.offset
        );
    }
}

// class ClockSync {
//     static offset = 0; //serverTime - clientTime [ms]
//     static rtt = 0;

//     static async syncRoundTrip(ws, attempts = 8) {
//         const results = [];

//         for (let i = 0; i < attempts; i++) {
//             const t0 = performance.now();
//             const resp = await new Promise((resolve) => {
//                 const id = Math.random().toString(36).slice(2);
//                 const handler = (msg) => {};
//             });
//         }
//     }
// }
