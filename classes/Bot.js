import { Character } from "./Character.js";
import { collisionLayer, checkWallCollision } from '../socket.js';


export class Bot extends Character{
    static list = {};

    constructor(){
        let x;
        let y;

        let isUnreachable = true;
        while(isUnreachable){
            x = 0 + 2000*(Math.random()-0.5);
            y = 0 + 1000*(Math.random()-0.5);
            isUnreachable = checkWallCollision(x, y, collisionLayer);
        }

        let id = Math.random();
        let username = `bot${Math.round(id*1000)}`;
        super(id, x, y, username);
        this.pressingDown = true;

        let _this = this

        this.randTime = 1000*(Math.random() * 3 + 1)

        setTimeout(()=>this.setRandDirection(), this.randTime);



        // this.randTime = Math.random()*10;


        Bot.list[this.id] = this;
    }

    setRandDirection(){
        let dir = Math.round(Math.random()*8)
        this.needsUpdate = true;

        switch(dir){
            case 0:
                this.pressingDown = false;
                this.pressingUp = false;
                this.pressingLeft = false;
                this.pressingRight = false;
                break;
            case 1:
                this.pressingDown = false;
                this.pressingUp = true;
                this.pressingLeft = false;
                this.pressingRight = false;
                break;
            case 2:
                this.pressingDown = false;
                this.pressingUp = true;
                this.pressingLeft = false;
                this.pressingRight = true;
                break;
            case 3:
                this.pressingDown = false;
                this.pressingUp = false;
                this.pressingLeft = false;
                this.pressingRight = true;
                break;
            case 4:
                this.pressingDown = true;
                this.pressingUp = false;
                this.pressingLeft = false;
                this.pressingRight = true;
                break;
            case 5:
                this.pressingDown = true;
                this.pressingUp = false;
                this.pressingLeft = false;
                this.pressingRight = false;
                break;
            case 6:
                this.pressingDown = true;
                this.pressingUp = false;
                this.pressingLeft = true;
                this.pressingRight = false;
                break;
            case 7:
                this.pressingDown = false;
                this.pressingUp = false;
                this.pressingLeft = true;
                this.pressingRight = false;
                break;
            case 8:
                this.pressingDown = false;
                this.pressingUp = true;
                this.pressingLeft = true;
                this.pressingRight = false;
                break;
        }

        this.pressingSpace = Math.random() < 0.5;
        this.randTime = 1000*(Math.random() * 3 + 1);
        setTimeout(()=>this.setRandDirection(), this.randTime);
    }
}