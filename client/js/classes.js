import { limiter } from './main.js'
import { Img, gameWidth, gameHeight, drawBuffer, tileImages } from './graphics.js';
import { Socket } from './clientSocket.js'
import { Sounds } from './sounds.js';
import { GameUI } from './gameButtons.js';

let selfId = null;

export class Entity{
    static list = {};

    constructor(initPack){
        if(!selfId) selfId = Socket.selfId;

        this.x = initPack.x;
        this.y = initPack.y;
        this.id = initPack.id;

        Entity.list[this.id] = this;

        //Audio node for every entity is overkill:
        // this.pan3d = new Tone.Panner3D(
        //     0,
        //     0,
        //     0
        // );
        // this.pan3d.panningModel = "HRTF";
        // this.pan3d.distanceModel = "inverse";
        // this.pan3d.connect(limiter);
    }

    update(pack){
        this.x = pack.x
        this.y = pack.y
        // if(Player.list[selfId]){
        //     this.pan3d.setPosition(
        //         (this.x - Player.list[selfId].x)*0.1,
        //         (this.y - Player.list[selfId].y)*0.1,
        //         0
        //     );
        // }
    }

    destroy(){
        delete Entity.list[this.id];
    }

    static getDistanceSq(id){
        //returns distance squared between client's player and entity with given ID
        console.log(`get distancesq id=${id}`)
        const entity = Entity.list[id];
        console.log(entity.x)
        const dx = entity.x - Player.list[selfId].x;
        const dy = entity.y - Player.list[selfId].y 
        const distSq = dx*dx + dy*dy;

        console.log(`dist sq ${distSq}`)
        return distSq;
    }

    getPos(){
        return {
            x: this.x,
            y: this.y
        }
    }
}

export class Player extends Entity{
    static list = {};
    static synOptions = {
    noise:{
        type: "pink"
    },
    envelope:{
        attack: 0.35,
        decay: 0.15,
    }
}

    constructor(initPack){
        super(initPack);
        this.name = initPack.name;
        this.hp = initPack.hp;
        if(this.id == Socket.selfId) GameUI.setHPLabel(this.hp);
        this.score = initPack.score;
        this.synthTimeout = false;

        this.direction = this.updateDirection(initPack.direction);
        this.idleAnimFrame = 2;
        this.imageAnim = Img.playerAnim;
        this.image = this.imageAnim[this.direction][this.idleAnimFrame];
        this.animFrame = 1 * 2;
        this.hueRot = Math.round(360 * Math.random())

        if(!SoundPool.globalSoundPool){
            SoundPool.globalSoundPool = new SoundPool(MAX_BULLET_SOUNDS);
        }

        Player.list[this.id] = this;
    }

    update(pack){
        this.hp = pack.hp;
        if (this.id == Socket.selfId) GameUI.setHPLabel(this.hp);
        this.score = pack.score;
        this.direction = this.updateDirection(pack.direction);
        if(this.x !== pack.x || this.y !== pack.y){
            super.update(pack);

            this.lastMovedTime = Date.now();
            
            this.animFrame += 1;
        }
    }

    destroy(){
        // this.bulletSounds.disposeAll();
    }

    draw(){
        if (!Player.list[selfId]) return;
        let x = this.x - Player.list[selfId].x + gameWidth/2;
        let y = this.y - Player.list[selfId].y + gameHeight/2;

        //set a static frame if player has not moved in some short time:
        if(Date.now() - this.lastMovedTime > 50){
            this.animFrame = this.idleAnimFrame;
        }

        //player image:
        drawBuffer.push({
            type: "image",
            img: this.image,
            x: x - 32,
            y: y - 32,
            sortY: y + 32,
            w: 64,
            h: 64,
            hueRot: this.hueRot,
        });
        this.image = this.imageAnim[this.direction][parseInt(this.animFrame/2%3)]

        //player nametag:
        let nameFont = ''
        if(this.id == selfId) nameFont = 'bold 20px Cascadia Mono'
        else nameFont = '16px Cascadia Mono'
        drawBuffer.push({
            type: 'text',
            text: this.name,
            x: x,
            y: y-36,
            sortY: y+32,
            font: nameFont,
        })

        //player hp bar:
        if(this.id != selfId){
            drawBuffer.push({
                type: 'hpbar',
                hp: this.hp,
                x: x,
                y: y,
                sortY: y-32,
            })
        }
    }

    updateDirection(direction){
        let angle = Math.round(direction)

        switch(angle){
            case 0:
                return 'e';
            case 180:
                return 'w';
            case 90:
                return 's';
            case -90:
                return 'n';
            case 27:
                return 'se';
            case -27:
                return 'ne';
            case 153:
                return 'sw';
            case -153:
                return 'nw';
        }

        return 's';
    }
}

export class Bot extends Player{
    constructor(initPack){
        super(initPack);
        
        this.idleAnimFrame = 1;
        this.imageAnim = Img.botAnim;
        // this.image = Img.botAnim[this.direction][this.idleAnimFrame];

        console.log('bot created')

        return this;
    }
}

//TODO: change the sound names on server side!!!
const soundNames = {
    Synth: "piano",
    DuoSynth: "guitar",
    AMSynth: "clarinet",
    FMSynth: "flute",
    MembraneSynth: "harp",
    MetalSynth: "organ",
    MonoSynth: "trumpet",
    PolySynth: "violin"
};

export class Bullet extends Entity{
    static list = {};

    constructor(initPack){
        super(initPack);
        console.log('bullet pack: ', initPack)
        this.parent = Player.list[initPack.parentId];
        this.sound = initPack.sound;
        this.hasSoundSlot = false;
        this.soundSlot = SoundPool.globalSoundPool.getFree(this.id);
        if(this.soundSlot){
            this.hasSoundSlot = true;
            this.soundSlot.occupierId = this.id;
            this.pan3D = this.soundSlot.pan3D;
            this.sampler = this.soundSlot.sampler;
            this.soundSlot.occupierId = this.id;

            this.sampler.setSound(this.sound);
        }

        this.note = initPack.note;
        this.duration = initPack.duration;
        this.imgWidth = 32;
        this.imgHeight = 32;
        this.labelSize = 20;
        this.shrinkFactor = 1000/Sounds.toneDurationToMs(this.duration);
        this.shrinkInterval = setInterval(()=>{
            this.imgWidth -= this.shrinkFactor;
            this.imgHeight -= this.shrinkFactor;
            this.labelSize -= this.shrinkFactor;
        }, 100)
        

        // let synthClass = Tone[initPack.sound];

        //get a free synth from synth pool:
        // this.synthPoolSlot = SynthPool.getFreeSynthSlot(initPack.sound);
        // this.synth = this.synthPoolSlot.synth;

        // this.noteShift = Sounds.notes.indexOf(this.note)
        // this.pitchShift = new Tone.PitchShift(this.noteShift)

        // this.synth = new Tone[initPack.sound];
        // console.log(this.synth)
        // this.pan3d.setPosition(
        //     (this.x - Player.list[selfId].x)*0.1,
        //     (this.y - Player.list[selfId].y)*0.1,
        //     0
        // )
        // this.synth.connect(this.pitchShift);
        // this.pitchShift.connect(this.pan3d)


        Bullet.list[this.id] = this;



        if(Tone.context.state == "running" && Sounds.audioOn && this.hasSoundSlot){
            // this.synth.triggerAttack(`${this.note}4`);
            // this.synth.start();
            this.sampler.play(this.note);
        }
    }

    update(pack){
        super.update(pack);
        if(Player.list[selfId] && this.hasSoundSlot){
            this.pan3D.setPosition(
                (this.x - Player.list[selfId].x)*0.1,
                (this.y - Player.list[selfId].y)*0.1,
                0
            );
        }
    }

    destroy(){
        if(this.hasSoundSlot){
            this.sampler.stop();
            this.soundSlot.free = true;
        }
        // this.synth.triggerRelease();
        // this.synth.stop();
        // this.synth.disconnect();
        // this.synthPoolSlot.busy = false;
        // this.pan3d.dispose();
        // this.pitchShift.dispose();
        // if(Tone.context.state == "running" && Sounds.audioOn){
        //     this.synth.triggerAttack(`${this.note}4`);
        // }

        // this.synthPoolSlot.busy = false;
        
        
        setTimeout(()=>{
            // this.synth.triggerRelease();
            
            
            super.destroy();
            delete Bullet.list[this.id]
        }, 50);
    }

    draw(){
        let x = this.x - Player.list[selfId].x + gameWidth/2;
        let y = this.y - Player.list[selfId].y + gameHeight/2;

        drawBuffer.push({
            type: 'image',
            img: Img.note[this.duration],
            x: x - this.imgWidth/2,
            y: y - this.imgHeight/2,
            sortY: y+16,
            w: this.imgWidth,
            h: this.imgHeight,
        })

        drawBuffer.push({
            type: 'text',
            text: this.note,
            x: x-8,
            y: y-16,
            sortY: y+16,
            font: `${this.labelSize}px Cascadia Mono`,
        })
    }
}

export class Pickup extends Entity{
    static list = {}

    constructor(initPack){
        super(initPack);
        Pickup.list[this.id] = this;
    }

    destroy(){
        super.destroy();
        delete Pickup.list[this.id];
    }

    draw(){
        if (!Player.list[selfId]) return;
        let x = this.x - Player.list[selfId].x + gameWidth/2;
        let y = this.y - Player.list[selfId].y + gameHeight/2;

        drawBuffer.push({
            type: 'image',
            img: Img.pickup,
            x: x-8,
            y: y,
            sortY: y+16,
            w: 16,
            h: 16
        })
    }
}

export class Tile{
    static list = {};

    constructor(initPack){
        this.id = initPack.id;
        this.x = initPack.x;
        this.y = initPack.y;
        this.gid = initPack.gid;
        this.layerId = initPack.layerId;

        Tile.list[this.id] = this;
    }

    draw(){
        if(!tileImages) return;
        let x = this.x - Player.list[selfId].x + gameWidth/2;
        let y = this.y - Player.list[selfId].y + gameHeight/2;
        const img = tileImages[this.gid];

        let shiftSortY;
        if(this.layerId>0){
            shiftSortY = 48 + 33 * (this.layerId-1);
        }
        else{
            shiftSortY = 64 * this.layerId;
        }

        if(!img) console.error('no img', this.gid)
        // else console.log(this.gid)

        drawBuffer.push({
            type: 'image',
            img: img,
            x: x,
            y: y,
            sortY: y+shiftSortY,
            layerId: this.layerId,
            w: 64,
            h: 64
        })
    }

    destroy(){
        // super.destroy();
        delete Tile.list[this.id];
    }
}

// export class SynthPool{
//     // let soundList = ["AMSynth", "DuoSynth", "FMSynth", "MembraneSynth", "MetalSynth", "MonoSynth", "PolySynth", "Synth"]
//     static pools = {
//         "AMSynth": [],
//         "DuoSynth": [],
//         "FMSynth": [],
//         "MembraneSynth": [],
//         "MetalSynth": [],
//         "MonoSynth": [],
//         "PolySynth": [],
//         "Synth": []
//     }

//     static populatePool(synthName, numberOfSynths){
//         for(let i = 0; i < numberOfSynths; i++){
//             // SynthPool.pools[synthName].push({
//             //     synth: new Tone[synthName](),
//             //     busy: false,
//             //     name: `${synthName}${i}`
//             // })
//             SynthPool.pools[synthName].push({
//                 synth: new Tone.Player("../audio/banjo.wav"),
//                 busy: false,
//                 name: `${synthName}${i}`,
//                 isFallback: false,
//             })
//         }
//     }

//     static populateAllPools(numberEach){
//         for(let synthName in SynthPool.pools){
//             // console.log(synthName)
//             SynthPool.populatePool(synthName, numberEach);
//         }
//         console.log(SynthPool.pools)
//     }

//     static getFreeSynthSlot(synthName){
//         const pool = SynthPool.pools[synthName];
//         const freeSlot = pool.find(slot => !slot.busy)
//         console.log(freeSlot)
//         if(freeSlot){
//             freeSlot.busy = true;
//             console.log(freeSlot)
//             return freeSlot;
//         }
//         else{
//             //fallback - no free slots left:
//             console.log(`getFreeSynthSlot fallback`)
//             const fallbackSlot = pool[0];
//             fallbackSlot.isFallback = true;
//             // fallbackSlot.synth.triggerRelease();
//             fallbackSlot.synth.stop();
//             fallbackSlot.synth.disconnect();
//             fallbackSlot.busy = true;
//             console.log(fallbackSlot)
//             return fallbackSlot;
//         }
//     }

//     //TODO: some synths create a lot of audio nodes! - if we create a lot of them the AudioContext is overloaded
//     //it would be better to render synth sounds as samples to Tone.Player
// }

const MAX_BULLET_SOUNDS = 16;
class SoundPool{
    static globalSoundPool;

    constructor(soundNum){
        this.pool = []

        for(let i = 0; i < soundNum; i++){
            this.pool.push(new SoundSlot())
        }
    }

    getFree(forID){
        const freeSlot = this.pool.find(slot => slot.free);

        if(freeSlot){
            freeSlot.free = false;
            return freeSlot;
        }
        else{
            console.log(`sound pool no free slots left`)
            //if sound slot is demanded by an entity further than current sound slot occupiers, it won't be given:
            const demandingEntityDistSq = Entity.getDistanceSq(forID);

            //find a slot occupied by the furthest entity:
            let maxDistSq = demandingEntityDistSq;
            let furthestSlot = undefined;
            for(let slot of this.pool){
                const occupierDistSq = Entity.getDistanceSq(slot.occupierId);
                console.log(demandingEntityDistSq, occupierDistSq)

                if(occupierDistSq>maxDistSq){
                    maxDistSq = occupierDistSq;
                    furthestSlot = slot;
                }
            }
            //if no occupier were further, we deny the demander the slot;
            if(!furthestSlot){
                return null;
            }

            //occupier which was further is deprived of the sound slot:
            console.log(furthestSlot)
            Entity.list[furthestSlot.occupierId].hasSoundSlot = false;
            return furthestSlot;
        }
    }

    disposeAll(){
        for(let slot of this.pool){
            slot.pan3D.dispose();
            slot.sampler.dispose();
            free = false;
        }
    }
}

class SoundSlot{
    constructor(){
        this.sampler = new Sampler("../audio/piano.wav");
        this.pan3D = new Tone.Panner3D();
        this.sampler.pitchShift.connect(this.pan3D);
        this.pan3D.connect(limiter);

        this.free = true;
        this.occupierId = null;
    }
    
}

//preload sound buffers:
const buffers = {
    piano: await new Tone.Buffer("../audio/piano.wav"),
    guitar: await new Tone.Buffer("../audio/guitar.wav"),
    clarinet: await new Tone.Buffer("../audio/clarinet.mp3"),
    flute: await new Tone.Buffer("../audio/flute.mp3"),
    harp: await new Tone.Buffer("../audio/harp.mp3"),
    organ: await new Tone.Buffer("../audio/organ.mp3"),
    trumpet: await new Tone.Buffer("../audio/trumpet.mp3"),
    violin: await new Tone.Buffer("../audio/violin.mp3"),
};

class Sampler{
    constructor(sampleSrc){
        this.samplePlayer = new Tone.Player()
        this.samplePlayer.playbackRate = 1;
        this.pitchShift = new Tone.PitchShift()

        this.samplePlayer.connect(this.pitchShift);
    }

    setSound(sound){
        this.samplePlayer._buffer = buffers[soundNames[sound]];
    }

    play(note){
        const shift = Sounds.notes.indexOf(note);
        console.log(note, shift)

        this.pitchShift.pitch = shift + 0;
        this.samplePlayer.start();
    }

    stop(){
        this.samplePlayer.stop();
    }

    dispose(){
        this.samplePlayer.dispose();
        this.pitchShift.dispose();
    }
}

