import {removePack} from '../socket.js'
import { Entity } from './Entity.js';
import { Player } from './Player.js';

export class Bullet extends Entity{
    static list = {};

    constructor(parent, angle){
        super(parent.x, parent.y);
        this.id = Math.random();
        this.parent = parent;
        this.speed = 20;

        this.spdX = Math.cos(angle/180*Math.PI) * this.speed;
        this.spdY = Math.sin(angle/180*Math.PI) * this.speed;

        this.sound = parent.weapon.sound;
        this.duration = parent.weapon.duration;

        Bullet.list[this.id] = this;
        this.timeout = setTimeout(()=>{
            // delete itself after timeout??
            this.destroy();
        }, 1000)
        return this;
    }

    update(){
        this.x += this.spdX;
        this.y += this.spdY;

        //collision check
        for(let i in Player.list){
            let targetPlayer = Player.list[i];
            if(this.parent != targetPlayer && this.isColliding(targetPlayer)){
                clearTimeout(this.timeout);
                this.destroy();
                targetPlayer.takeDmg(1);
            }
        }
    }

    destroy(){
        removePack.bullet.push(this.id)
        delete Bullet.list[this.id]
    }
}