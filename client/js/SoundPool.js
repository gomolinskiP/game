import { Entity } from "./object_classes/C_Entity.js";
import { Sounds } from "./sounds.js";
import { SoundAssets } from "./Assets.js";

//TODO: change the sound names on server side!!!
const soundNames = {
    Synth: "piano",
    DuoSynth: "guitar",
    AMSynth: "clarinet",
    FMSynth: "flute",
    MembraneSynth: "harp",
    MetalSynth: "organ",
    MonoSynth: "trumpet",
    PolySynth: "violin",
    steps: "steps",
    pickup: "pickup"
};

const MAX_BULLET_SOUNDS = 8;
export class SoundPool {
    static globalSoundPool;

    constructor(soundNum) {
        this.pool = [];

        for (let i = 0; i < soundNum; i++) {
            this.pool.push(new SoundSlot());
        }
    }

    getFree(forID, priority) {
        const freeSlot = this.pool.find((slot) => slot.free);

        if (freeSlot) {
            freeSlot.free = false;
            freeSlot.occupierPriority = priority;
            return freeSlot;
        } else {
            console.log(`sound pool no free slots left`);
            //if sound slot is demanded by an entity further than current sound slot occupiers, it won't be given:
            const demandingEntityDistSq =
                Entity.getDistanceSq(forID) / priority;

            //find a slot occupied by the furthest entity:
            let maxDistSq = demandingEntityDistSq;
            let furthestSlot = undefined;
            for (let slot of this.pool) {
                const occupierDistSq = Entity.getDistanceSq(slot.occupierId);
                // console.log(demandingEntityDistSq, occupierDistSq)

                if (occupierDistSq > maxDistSq) {
                    maxDistSq = occupierDistSq;
                    furthestSlot = slot;
                }
            }
            //if no occupier were further, we deny the demander the slot;
            if (!furthestSlot) {
                return null;
            }

            //occupier which was further is deprived of the sound slot:
            furthestSlot.sampler.stop();
            furthestSlot.occupierId = forID;
            Entity.list[furthestSlot.occupierId].hasSoundSlot = false;
            return furthestSlot;
        }
    }

    disposeAll() {
        for (let slot of this.pool) {
            slot.pan3D.dispose();
            slot.sampler.dispose();
            free = false;
        }
    }
}


class SoundSlot {
    constructor() {
        this.sampler = new Sampler("../audio/piano.wav");
        this.pan3D = new Tone.Panner3D({
            rollofFactor: 0.01,
            distanceModel: "exponential",
            panningModel: "equalpower",
        });
        // this.pan3D.rollofFactor = 0.01;
        // this.pan3D.panningModel = "HRTF";
        // this.distanceModel = "linear";
        this.sampler.samplePlayer.connect(this.pan3D);
        this.pan3D.connect(Sounds.limiter);

        this.free = true;
        this.occupierId = null;
        this.occupierPriority = 0;
    }
}

class Sampler {
    constructor(sampleSrc) {
        this.samplePlayer = new Tone.Player();
        this.samplePlayer.fadeIn = 0.01;
        this.samplePlayer.fadeOut = 0.01;
        // this.samplePlayer = new Tone.Synth();
        this.samplePlayer.playbackRate = 1;
        // this.pitchShift = new Tone.PitchShift();

        // this.samplePlayer.connect(this.pitchShift);
    }

    setSound(sound) {
        this.samplePlayer._buffer = SoundAssets.buffers[soundNames[sound]];
    }

    play(note) {
        if (Tone.context.state != "running") return;
        let shift = Sounds.notes.indexOf(note);
        const scaleBaseIndex = Sounds.notes.indexOf(Sounds.scaleBase);

        if (shift >= scaleBaseIndex) shift -= 12;

        // console.log(note, shift)

        this.samplePlayer.stop();
        this.samplePlayer.playbackRate = Math.pow(2, shift / 12);
        // this.pitchShift.pitch = shift;
        this.samplePlayer.start();

        // this.samplePlayer.triggerAttackRelease(note+"5", "32n");
    }

    stop() {
        //TODO error if sampler is not playing:
        this.samplePlayer.stop();
    }

    dispose() {
        this.samplePlayer.dispose();
        // this.pitchShift.dispose();
    }
}

if (!SoundPool.globalSoundPool) {
    SoundPool.globalSoundPool = new SoundPool(MAX_BULLET_SOUNDS);
}
