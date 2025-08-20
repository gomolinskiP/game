import { Character } from "./Character.js";
import { wallQTree, floorQTree, checkTilesCollision, mapBoundRect } from '../socket.js';


export class Bot extends Character{
    static list = {};

    constructor(){
        let x;
        let y;

        let isPositionForbidden = true;
        while(isPositionForbidden){
            x = mapBoundRect.x + mapBoundRect.width*(Math.random());
            y = mapBoundRect.y + mapBoundRect.height*(Math.random());

            //check if random position is colliding a wall or is not on floor
            isPositionForbidden = checkTilesCollision(x, y, wallQTree) || !checkTilesCollision(x, y, floorQTree)
        }

        let id = Math.random();
        let username = `bot${Math.round(id*1000)}`;
        super(id, x, y, username);

        this.randTime = 1000*(Math.random() * 3 + 1)
        setTimeout(()=>this.setRandDirection(), this.randTime);

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