import { Entity } from "./C_Entity.js";
import { Sounds } from "../sounds.js";
import { Graphics } from "../graphics.js";
import { Socket } from "../clientSocket.js";
import { Player } from "./C_Character.js";

const selfId = Socket.selfId;

export class Pickup extends Entity {
    static list = {};

    constructor(id, initPack) {
        super(id, initPack);
        this.sound = "pickup";
        this.isPicked = false;
        this.hasSoundSlot = false;

        this.imgWidth = this.imgHeight = 16;
        this.animDir = 1;

        Pickup.list[this.id] = this;
    }

    destroy() {
        this.isPicked = true;
        if (!this.hasSoundSlot) {
            this.requestSoundSlot(1);
        }

        if (this.hasSoundSlot) {
            this.pan3D.positionX.value =
                (this.x - Player.list[selfId].x) * 0.05;
            this.pan3D.positionZ.value =
                (this.y - Player.list[selfId].y) * 0.05;

            const randNote =
                Sounds.allowedNotes[
                    Math.floor(Math.random() * Sounds.allowedNotes.length)
                ];
            this.sampler.play(randNote);

            setTimeout(() => {
                this.soundSlot.free = true;
                super.destroy();
                delete Pickup.list[this.id];
            }, 500);
        }
    }

    draw() {
        if (!Player.list[selfId]) return;
        if (this.isPicked) return;
        let x = this.x - Player.list[selfId].x + Graphics.gameWidth / 2;
        let y = this.y - Player.list[selfId].y + Graphics.gameHeight / 2;

        Graphics.drawBuffer.push({
            type: "image",
            img: Graphics.Img.pickup,
            x: x - this.imgWidth / 2,
            y: y - this.imgHeight / 2 + 8,
            sortY: y + 16,
            w: this.imgWidth,
            h: this.imgHeight,
        });

        if (this.imgWidth > 20) {
            this.animDir = -1;
        }
        if (this.imgWidth < 14) {
            this.animDir = 1;
        }

        this.imgWidth = this.imgHeight += this.animDir * Math.random() * 0.2;
    }
}
