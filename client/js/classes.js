import { limiter, selfId } from './main.js'
import { Img, gameWidth, gameHeight, drawBuffer, tileImages } from './graphics.js';

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
        this.score = initPack.score;
        this.synthTimeout = false;
        this.footstepSyn = new Tone.NoiseSynth(Player.synOptions);
        this.pan3d.distanceModel = "linear";
        this.footstepVolume = new Tone.Volume(-9);
        this.footstepSyn.connect(this.footstepVolume);
        this.footstepVolume.connect(this.pan3d);

        this.direction = this.updateDirection(initPack.direction);
        this.image = Img.player;
        this.animFrame = 1 * 2;

        Player.list[this.id] = this;
    }

    update(pack){
        this.hp = pack.hp;
        this.score = pack.score;
        this.direction = this.updateDirection(pack.direction);
        if(this.x !== pack.x || this.y !== pack.y){
            super.update(pack);

            this.lastMovedTime = Date.now();
            
            this.animFrame += 1;

            
            if(!this.synthTimeout && Tone.context.state == "running"){
                this.synthTimeout = true;
                this.footstepSyn.triggerAttackRelease("128n");
                setTimeout(()=>{
                    this.synthTimeout = false;
                }, 250);
            }
        }
    }

    draw(){
        let x = this.x - Player.list[selfId].x + gameWidth/2;
        let y = this.y - Player.list[selfId].y + gameHeight/2;

        //set a static frame if player has not moved in some short time:
        if(Date.now() - this.lastMovedTime > 50){
            this.animFrame = 1 * 2;
        }

        //player image:
        drawBuffer.push({
                    type: "image",
                    img: this.image,
                    x: x-32,
                    y: y-32,
                    sortY: y+32,
                    w: 64,
                    h: 64,
        })
        this.image = Img.playerAnim[this.direction][parseInt(this.animFrame/2%3)]

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

        if(Tone.context.state == "running"){
            this.synth.triggerAttack(`${this.note}5`);
        }
    }

    destroy(){
        clearInterval(this.interval);
        this.synth.triggerRelease();
        if(Tone.context.state == "running"){
            this.synth.triggerAttack(`${this.note}4`);
        }
        
        setTimeout(()=>{
            this.synth.triggerRelease();
            this.synth.dispose();
            this.pan3d.dispose();
            delete Bullet.list[this.id]
        }, 250);
    }

    draw(){
        let x = this.x - Player.list[selfId].x + gameWidth/2;
        let y = this.y - Player.list[selfId].y + gameHeight/2;

        drawBuffer.push({
            type: 'image',
            img: Img.note[this.duration],
            x: x-16,
            y: y-16,
            sortY: y+16,
            w: 32,
            h: 32,
        })

        drawBuffer.push({
            type: 'text',
            text: this.note,
            x: x-8,
            y: y-16,
            sortY: y+16,
            font: '20px Cascadia Mono',
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
        delete Pickup.list[this.id];
    }

    draw(){
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
        delete Tile.list[this.id];
    }
}