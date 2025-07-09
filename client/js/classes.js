import { limiter, synOptions, selfId } from './main.js'

export class Entity{
    constructor(initPack){
        this.x = initPack.x;
        this.y = initPack.y;
        this.id = initPack.id;

        this.pan3d = new Tone.Panner3D(
            0,
            0,
            0
        );
        this.pan3d.panningModel = "HRTF";
        // this.pan3d.distanceModel = "inverse";
        this.pan3d.connect(limiter);
    }

    update(pack){
        this.x = pack.x
        this.y = pack.y
        if(Player.list[selfId]){
            this.pan3d.setPosition(
                (this.x - Player.list[selfId].x)*0.1,
                (this.y - Player.list[selfId].y)*0.1,
                0
            );
        }
    }
}

export class Player extends Entity{
    static list = {};

    constructor(initPack){
        super(initPack);
        this.name = initPack.name;
        this.hp = initPack.hp;
        this.synthTimeout = false;
        this.footstepSyn = new Tone.NoiseSynth(synOptions);
        
        this.footstepSyn.connect(this.pan3d);

        Player.list[this.id] = this;
    }

    update(pack){
        this.hp = pack.hp;
        if(this.x !== pack.x || this.y !== pack.y){
            super.update(pack);

            if(!this.synthTimeout && Tone.context.state == "running"){
                this.synthTimeout = true;
                this.footstepSyn.triggerAttackRelease("128n");
                setTimeout(()=>{
                    this.synthTimeout = false;
                }, 250);
            }
        }
    }
}

export class Bullet extends Entity{
    static list = {};

    constructor(initPack){
        super(initPack);
        this.note = initPack.note;
        this.duration = initPack.duration;

        // let synthClass = Tone[initPack.sound];
        this.synth = new Tone[initPack.sound];
        this.pan3d.setPosition(
            (this.x - Player.list[selfId].x)*0.1,
            (this.y - Player.list[selfId].y)*0.1,
            0
        )
        this.synth.connect(this.pan3d);

        Bullet.list[this.id] = this;

        this.interval = setInterval(()=>{
            // this.synth.triggerAttackRelease("C5", "64n");
        }, 200);

        this.synth.triggerAttack(`${this.note}3`);
    }

    destroy(){
        clearInterval(this.interval);
        this.synth.triggerRelease();
        this.synth.triggerAttack(`${this.note}2`);

        setTimeout(()=>{
            this.synth.triggerRelease();
            this.synth.dispose();
            this.pan3d.dispose();
            delete Bullet.list[this.id]
        }, 250);
    }
}

export class Pickup extends Entity{
    static list = {}

    constructor(initPack){
        super(initPack);
        Pickup.list[this.id] = this;
    }

    destroy(){
        delete Pickup.list[this.id];
    }
}