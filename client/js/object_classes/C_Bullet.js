import { Entity } from "./C_Entity.js";
import { Graphics } from "../graphics.js";
import { Sounds } from "../sounds.js";
import { GhostBullet } from "./BulletScheduler.js";
import { GameUI } from "../gameButtons.js";
import { Socket } from "../clientSocket.js";
import { Player } from "./C_Character.js";

const selfId = Socket.selfId;

export class Bullet extends Entity{
    static list = {};

    constructor(id, initPack){
        super(id, initPack);
        // console.log('bullet pack: ', initPack)
        
    this.note = initPack.note;
        this.duration = initPack.duration;
        this.parent = Player.list[initPack.parentId];
        this.sound = initPack.sound;
        this.duration = initPack.duration;
        this.timeQuantizePos;
        switch (this.duration) {
            case "1n.":
                this.timeQuantizePos = "1:2:0";
                break;
            case "1n":
                this.timeQuantizePos = "1:0:0";
                break;
            case "2n.":
                this.timeQuantizePos = "0:3:0";
                break;
            case "2n":
                this.timeQuantizePos = "0:2:0";
                break;
            case "4n.":
                this.timeQuantizePos = "0:1:2";
                break;
            case "4n":
                this.timeQuantizePos = "0:1:0";
                break;
            case "8n":
                this.timeQuantizePos = "0:0:2";
                break;
            default:
                console.warn("unknown duration", duration);
            // this.sampler.setSound(this.sound);
        }
        this.hasSoundSlot = false;

        //find parent's ghost bullets:
        let ghostBullet = null;
        if(this.parent) ghostBullet = GhostBullet.listByID[this.parent.id + this.note];
        if(ghostBullet != null){
            console.log('found ghost bullet', ghostBullet, 'from ', Date.now() - ghostBullet.creationTimestamp, 'ms ago')
            ghostBullet.received = true;
            this.soundSlot = ghostBullet.soundSlot
            delete GhostBullet.listByID[this.parent.id + this.note];
        }else{
            console.log('did not found ghost bullet');
        }

        if(this.soundSlot){
            console.log('bullet has soundslot')
            this.hasSoundSlot = true;
            this.soundSlot.occupierId = this.id;
            this.pan3D = this.soundSlot.pan3D;
            this.pan3D.setPosition(
                (this.x - Player.list[selfId].x) * 0.1,
                0,
                (this.y - Player.list[selfId].y) * 0.1
            );
            this.sampler = this.soundSlot.sampler;

            Tone.Transport.scheduleOnce(() => {
                this.sampler.stop();
                this.soundSlot.free = true;
                this.soundSlot = null;
            }, this.timeQuantizePos);

        }

        
        this.imgWidth = 32;
        this.imgHeight = 32;
        this.labelSize = 30;
        this.shrinkFactor = 1000/Sounds.toneDurationToMs(this.duration);
        this.shrinkInterval = setInterval(()=>{
            this.imgWidth -= this.shrinkFactor;
            this.imgHeight -= this.shrinkFactor;
            this.labelSize -= this.shrinkFactor;
        }, 100)
        
        //For highlighting duration timeout:
        if (initPack.parentId == selfId) {
            //client's bullet
            GameUI.startDurationTimeoutHighlight(this.duration);
        }

        Bullet.list[this.id] = this;



        if(Tone.context.state == "running" && Sounds.audioOn && this.hasSoundSlot){
            // this.synth.triggerAttack(`${this.note}4`);
            // this.synth.start();
            // this.sampler.play(this.note);
        }
    }

    update(pack){
        super.update(pack);
        if(Player.list[selfId] && this.hasSoundSlot){
            this.pan3D.setPosition(
                (this.x - Player.list[selfId].x) * 0.1,
                0,
                (this.y - Player.list[selfId].y) * 0.1
            );
        }

        if(!this.hasSoundSlot){
            if(this.requestSoundSlot(8)){
                this.sampler.samplePlayer.fadeIn = 0.5;
                this.sampler.play(this.note);
            }

        }
    }

    destroy(){
        if(this.hasSoundSlot){
            this.sampler.stop();
            this.soundSlot.free = true;
        }
        
        
        setTimeout(()=>{
            super.destroy();
            delete Bullet.list[this.id]
        }, 50);
    }

    draw(){
        let x = this.x - Player.list[selfId].x + Graphics.gameWidth/2;
        let y = this.y - Player.list[selfId].y + Graphics.gameHeight/2;

        Graphics.drawBuffer.push({
            type: "image",
            img: Graphics.Img.note[this.duration],
            x: x - this.imgWidth / 2,
            y: y - this.imgHeight / 2,
            sortY: y + 16,
            w: this.imgWidth,
            h: this.imgHeight,
        });

        Graphics.drawBuffer.push({
            type: 'text',
            text: this.note,
            x: x-8,
            y: y-16,
            sortY: y+16,
            font: `${this.labelSize}px Cascadia Mono`,
        })
    }
}