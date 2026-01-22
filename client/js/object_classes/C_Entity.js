import { Socket } from "../clientSocket.js";
import { SoundPool } from "../SoundPool.js";
import { Player } from "./C_Character.js";

const selfId = Socket.selfId;

export class Entity {
    static list = {};

    constructor(id, initPack) {
        if (!selfId) selfId = Socket.selfId;

        this.x = initPack.x;
        this.y = initPack.y;
        this.id = id;

        Entity.list[this.id] = this;
    }

    update(pack) {
        this.x = pack.x;
        this.y = pack.y;
    }

    destroy() {
        delete Entity.list[this.id];
    }

    static getDistanceSq(id) {
        if (!selfId) return 9999;
        //returns distance squared between client's player and entity with given ID
        // console.log(`get distancesq id=${id}`)
        const entity = Entity.list[id];
        if (entity === undefined) return 9999;

        // console.log(entity.x)
        const dx = entity.x - Player.list[selfId].x;
        const dy = entity.y - Player.list[selfId].y;
        const distSq = dx * dx + dy * dy;

        // console.log(`dist sq ${distSq}`)
        return distSq;
    }

    getPos() {
        return {
            x: this.x,
            y: this.y,
        };
    }

    requestSoundSlot(priority) {
        if (!this.sound) return;
        if (this.hasSoundSlot) return;

        this.soundSlot = SoundPool.globalSoundPool.getFree(this.id, priority);
        if (this.soundSlot) {
            this.hasSoundSlot = true;
            this.soundSlot.occupierId = this.id;
            this.pan3D = this.soundSlot.pan3D;
            this.sampler = this.soundSlot.sampler;

            this.sampler.setSound(this.sound);
            return true;
        } else return false;
    }

    freeSoundSlot() {
        if (!this.hasSoundSlot) return;

        this.soundSlot.free = true;
        this.soundSlot.occupierId = null;
    }
}
