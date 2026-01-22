import { Entity } from "./C_Entity.js";
import { GameUI } from "../gameButtons.js";
import { Graphics } from "../graphics.js";
import { SoundPool } from "../SoundPool.js";
import { BulletScheduler } from "./BulletScheduler.js";
import { Socket } from "../clientSocket.js";

const selfId = Socket.selfId;

export class Player extends Entity {
    static list = {};

    static stepSoundTimeoutMS = 250;

    constructor(id, initPack) {
        super(id, initPack);
        this.name = initPack.name;
        this.hp = initPack.hp;
        this.score = initPack.score;
        this.isShooting = initPack.isShooting;
        this.selectedDuration = initPack.duration;
        this.weaponType = initPack.weaponType;
        this.selectedNoteID = initPack.selectedNoteID;
        this.selectedSound = initPack.selectedSound;

        this.footstepScheduler = null;

        if (this.id == Socket.selfId) {
            GameUI.setHPLabel(this.hp);
            GameUI.setScoreLabel(this.score);
        }
        this.synthTimeout = false;

        this.direction = this.updateDirection(initPack.direction);
        this.idleAnimFrame = 2;
        this.imageAnim = Graphics.Img.playerAnim;
        this.image = this.imageAnim[this.direction][this.idleAnimFrame];
        this.animFrame = 1 * 2;
        this.hueRot = Math.round(360 * Math.random());

        this.justDamaged = false;

        this.sound = "steps";
        this.stepSoundTimeout = false;
        this.hasSoundSlot = false;
        this.requestSoundSlot(5);

        Player.list[this.id] = this;
    }

    update(pack) {
        if (Player.list[selfId] == undefined) return;
        // console.log('player update', pack)
        if (pack.hp != undefined) {
            if (pack.hp < this.hp) {
                this.justDamaged = true;

                setTimeout(() => {
                    this.justDamaged = false;
                }, 300);
            }

            this.hp = pack.hp;

            if (this.id == Socket.selfId) {
                GameUI.setHPLabel(this.hp);
            }
        }

        if (pack.score) {
            this.score = pack.score;

            if (this.id == Socket.selfId) {
                GameUI.setScoreLabel(this.score);
            }
        }

        if (pack.duration) {
            if (this.selectedDuration != pack.duration) {
                this.selectedDuration = pack.duration;
                if (this.scheduler) {
                    this.scheduler.remove();
                    this.scheduler = null;
                }

                if (this.id == selfId) {
                    GameUI.setDurationLabel(pack.duration);
                }
            }
        }

        if (pack.selectedSound) {
            if (this.selectedSound != pack.selectedSound) {
                this.selectedSound = pack.selectedSound;
                if (this.scheduler) {
                    this.scheduler.remove();
                    this.scheduler = null;
                }

                if (this.id == selfId) {
                    GameUI.setSoundLabel(pack.selectedSound);
                }
            }
        }

        if (pack.weaponType) {
            if (this.weaponType != pack.weaponType) {
                this.weaponType = pack.weaponType;
                if (this.scheduler) {
                    this.scheduler.remove();
                    this.scheduler = null;
                }
                if (this.id == selfId) {
                    GameUI.setWeaponType(pack.weaponType);
                }
            }
        }

        if (pack.selectedNoteID != undefined) {
            if (this.selectedNoteID != pack.selectedNoteID) {
                this.selectedNoteID = pack.selectedNoteID;
                if (this.scheduler) {
                    this.scheduler.remove();
                    this.scheduler = null;
                }
            }
        }

        if (pack.isShooting != undefined) {
            this.isShooting = pack.isShooting;
        }

        if (this.isShooting && !this.scheduler) {
            this.scheduler = new BulletScheduler(
                this,
                this.selectedSound,
                this.selectedDuration,
                this.weaponType
            );
        } else if (!this.isShooting && this.scheduler) {
            this.scheduler.remove();
            this.scheduler = null;
        }

        if (pack.direction != undefined) {
            this.direction = this.updateDirection(pack.direction);
        }

        if (pack.x && pack.y) {
            if (this.x !== pack.x || this.y !== pack.y) {
                //is walking:
                if (this.id == selfId) {
                    Graphics.updateFog(pack.x - this.x, pack.y - this.y);
                }

                super.update(pack);

                this.lastMovedTime = Date.now();
                this.animFrame += 1;

                //walking sounds for characters:
                if (this.footstepScheduler == null)
                    this.footstepScheduler = new BulletScheduler(
                        this,
                        "steps",
                        "8n",
                        "normal"
                    );
                if (this.isWalkingTimeout) clearTimeout(this.isWalkingTimeout);
                this.isWalkingTimeout = setTimeout(() => {
                    if (this.footstepScheduler) this.footstepScheduler.remove();
                    this.footstepScheduler = null;
                }, 100);
            } else {
                // //not walking:
            }
        }
    }

    destroy() {
        // this.bulletSounds.disposeAll();
        if (this.hasSoundSlot) {
            this.sampler.stop();
            this.soundSlot.free = true;
        }

        if (this.scheduler) {
            this.scheduler.remove();
        }
    }

    draw() {
        if (!Player.list[selfId]) return;
        let x = this.x - Player.list[selfId].x + Graphics.gameWidth / 2;
        let y = this.y - Player.list[selfId].y + Graphics.gameHeight / 2;

        //set a static frame if player has not moved in some short time:
        if (Date.now() - this.lastMovedTime > 50) {
            this.animFrame = this.idleAnimFrame;
        }

        //player image:
        Graphics.drawBuffer.push({
            type: "image",
            img: this.image,
            x: x - 32,
            y: y - 32,
            sortY: y + 32,
            w: 64,
            h: 64,
            hueRot: this.hueRot,
        });
        this.image =
            this.imageAnim[this.direction][parseInt((this.animFrame / 2) % 3)];

        //player nametag:
        let nameFont = "";
        if (this.id == selfId) nameFont = "bold 20px Cascadia Mono";
        else nameFont = "16px Cascadia Mono";
        Graphics.drawBuffer.push({
            type: "text",
            text: this.name,
            x: x,
            y: y - 36,
            sortY: y + 32,
            font: nameFont,
        });

        //player hp bar:
        if (this.id != selfId || true) {
            Graphics.drawBuffer.push({
                type: "hpbar",
                hp: this.hp,
                x: x,
                y: y,
                sortY: y - 32,
            });
        }

        if (this.justDamaged) {
            Graphics.drawBuffer.push({
                type: "text",
                text: "HIT!",
                x: x,
                y: y - 66,
                sortY: y + 32,
                font: nameFont,
                color: "red",
            });
        }
    }

    updateDirection(direction) {
        let angle = Math.round(direction);
        // console.log(angle);

        switch (angle) {
            case 0:
                return "e";
            case 180:
                return "w";
            case 90:
                return "s";
            case -90:
                return "n";
            case 45:
                return "se";
            case -45:
                return "ne";
            case 135:
                return "sw";
            case -135:
                return "nw";
        }

        return "s";
    }
}
