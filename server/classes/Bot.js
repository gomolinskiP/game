import { stat } from "fs";
import { Bullet } from "./Bullet.js";
import { Character } from "./Character.js";
import { Map } from "./Map.js";
import { Pickup } from "./Pickup.js";
import { WalkAgent } from "./RL.js";
import { Tile } from "./Tile.js";


export class Bot extends Character {
    static list = {};

    static stepAll() {
        for (const id in Bot.list) {
            const bot = Bot.list[id];

            bot.walkAgent.step();
        }
    }

    static startAgentStep() {
        setInterval(() => {
            Bot.stepAll();
        }, 250);
    }

    constructor() {
        let x = 0;
        let y = 0;

        // let isPositionForbidden = true;
        // while(isPositionForbidden){
        //     x = Map.boundRect.x + Map.boundRect.width*(Math.random());
        //     y = Map.boundRect.y + Map.boundRect.height*(Math.random());

        //     //check if random position is colliding a wall or is not on floor
        //     isPositionForbidden = Tile.checkTilesCollision(x, y, Tile.wallQTree) || !Tile.checkTilesCollision(x, y, Tile.floorQTree)
        // }

        let id = Math.random();
        let username = `bot${Math.round(id * 1000)}`;
        super(id, x, y, username);

        // this.randTime = 1000*(Math.random() * 3 + 1)
        // setTimeout(()=>this.setRandDirection(), this.randTime);

        this.walkAgent = new WalkAgent(this);
        this.agentReward = 0;

        Bot.list[this.id] = this;
    }

    updatePosition() {
        super.updatePosition();

        const rect = {
            x: this.x - 250,
            y: this.y - 250,
            width: 500,
            height: 500,
        };

        const pickupCandidates = Pickup.quadtree.retrieve(rect);
        let cumulatedDistSq = 0;
        for (const pickup of pickupCandidates) {
            if (
                pickup.x > rect.x &&
                pickup.x < rect.x + rect.width &&
                pickup.y > rect.y &&
                pickup.y < rect.y + rect.height
            ) {
                const dx = this.x - pickup.x;
                const dy = this.y - pickup.y;
                //cumulated reward for every close pickup
                const distSq = dx * dx + dy * dy;

                cumulatedDistSq += distSq;

                // this.agentReward += Math.min(1, (1 / dx*dx + dy*dy) * 1e-6);
            }
        }
        if (this.lastCumulatedDistSq) {
            // this.agentReward +=
            //     (this.lastCumulatedDistSq - cumulatedDistSq) * 1e-6;
        }
        this.lastCumulatedDistSq = cumulatedDistSq;
    }

    getGridState(objQuadtree) {
        let resultArray = [];

        const gridDims = WalkAgent.gridDims,
            cellW = WalkAgent.cellW,
            cellH = WalkAgent.cellH;
        const maxDistSq = WalkAgent.maxDistSq;
        const maxDX = WalkAgent.maxDX,
            maxDY = WalkAgent.maxDY;

        let minDX = maxDX,
            minDY = maxDY,
            minDistSq = maxDistSq;

        for (let i = 0; i < gridDims; i++) {
            for (let j = 0; j < gridDims; j++) {
                const cellX = this.x - (gridDims * cellW) / 2 + j * cellW;
                const cellY = this.y - (gridDims * cellH) / 2 + i * cellH;

                let isObjInCell = 0;

                const objCandidates = objQuadtree.retrieve({
                    x: cellX,
                    y: cellY,
                    width: cellW,
                    height: cellH,
                });

                for (const candidate of objCandidates) {
                    if (
                        candidate.x + candidate.width > cellX &&
                        candidate.x < cellX + cellW &&
                        candidate.y + candidate.height > cellY &&
                        candidate.y < cellY + cellH
                    ) {
                        //object of quadtree is in the cell [i][j]
                        isObjInCell = 1;
                        const dx = this.x - candidate.x + candidate.width / 2;
                        const dy = this.y - candidate.y + candidate.height / 2;
                        const distSq = dx * dx + dy * dy;

                        if (distSq < minDistSq) {
                            minDistSq = distSq;
                            minDX = dx;
                            minDY = dy;
                        }
                    }
                }

                resultArray.push(isObjInCell);
            }
        }
        return resultArray;

        // resultArray.push(minDX / maxDX, minDY / maxDY);

        // if (!this.lastMinDistSq) this.lastMinDistSq = minDistSq;
        // else {
        //     // give agent reward:
        //     this.agentReward += Math.max(
        //         -1,
        //         Math.min(
        //             1,
        //             (Math.sqrt(this.lastMinDistSq) - Math.sqrt(minDistSq)) / 10
        //         )
        //     );
        //     this.lastMinDistSq = minDistSq;
        // }
    }

    nearestObjDist(objQuadtree, objList) {
        const nearest = this.findNearest(
            objList,
            objQuadtree,
            WalkAgent.maxDist
        );
        const distSq = this.getDistSq(nearest);
        return Math.sqrt(distSq);
    }

    getEnvironment() {
        let state = [];
        // - 9 najbliższych kafelków mapy (x i y);
        // - 1 najbliższy obiekt klasy Pickup (x i y);
        // - 1 najbliższy obiekt klasy bullet (x, y oraz parametr "note");
        // - 1 najbliższy obiekt klasy Character (x, y oraz HP);
        // - czas serwera,
        // - informacje o sobie (x, y, HP)

        //self-info
        // state.push(0, 0, this.hp/1000);

        if (isNaN(this.spdX / this.speed)) {
            state.push(0, 0);
        } else {
            state.push(this.spdX / this.speed, this.spdY / this.speed);
        }

        //add pickup grid state to RL state (is pickup in one of the cells around agent? 0/1):
        const pickupGridState = this.getGridState(Pickup.quadtree);
        state = state.concat(pickupGridState);

        const nearestPickup = this.findNearest(
            Pickup.list,
            Pickup.quadtree,
            WalkAgent.maxDist
        );
        if (nearestPickup) {
            const nearestPickupDist = this.getDist(nearestPickup);
            if (!this.lastNearestPickupDist) {
                this.lastNearestPickupDist = nearestPickupDist;
            }

            //reward for getting closer to/further from the nearest pickup (positive if closer, negative if further):
            const pickupDistDeltaReward = Math.max(
                -1,
                Math.min(
                    1,
                    (this.lastNearestPickupDist - nearestPickupDist) / 1000
                )
            );
            this.agentReward += pickupDistDeltaReward;

            const D = this.getDxDy(nearestPickup);
            const pDx = D.dx,
                pDy = D.dy;

            if (pDx && pDy) {
                state.push(pDx / WalkAgent.maxDX, pDy / WalkAgent.maxDY);
            } else {
                state.push(1, 1);
            }
        } else {
            state.push(1, 1);
        }

        //tiles:
        //add tile grid state to RL state (is a tile in one of the cells around agent? 0/1):
        const floorTileGridState = this.getGridState(Tile.floorQTree);
        state = state.concat(floorTileGridState);

        const wallTileGridState = this.getGridState(Tile.wallQTree);
        state = state.concat(wallTileGridState);

        //bullet:

        // //character:

        return state;
    }

    setWalkAction(move) {
        this.needsUpdate = true;
        this.pressingUp = move.u;
        this.pressingDown = move.d;
        this.pressingLeft = move.l;
        this.pressingRight = move.r;
    }

    getReward() {
        //add negative reward if agent is not moving:
        if (Math.abs(this.spdX) < 0.1 && Math.abs(this.spdY) < 0.1) {
            this.agentReward -= 0.3;
        }

        const reward = this.agentReward;
        this.agentReward = 0;
        return reward;
    }

    // setRandDirection() {
    //     let dir = Math.round(Math.random() * 8);
    //     this.needsUpdate = true;

    //     switch (dir) {
    //         case 0:
    //             this.pressingDown = false;
    //             this.pressingUp = false;
    //             this.pressingLeft = false;
    //             this.pressingRight = false;
    //             break;
    //         case 1:
    //             this.pressingDown = false;
    //             this.pressingUp = true;
    //             this.pressingLeft = false;
    //             this.pressingRight = false;
    //             break;
    //         case 2:
    //             this.pressingDown = false;
    //             this.pressingUp = true;
    //             this.pressingLeft = false;
    //             this.pressingRight = true;
    //             break;
    //         case 3:
    //             this.pressingDown = false;
    //             this.pressingUp = false;
    //             this.pressingLeft = false;
    //             this.pressingRight = true;
    //             break;
    //         case 4:
    //             this.pressingDown = true;
    //             this.pressingUp = false;
    //             this.pressingLeft = false;
    //             this.pressingRight = true;
    //             break;
    //         case 5:
    //             this.pressingDown = true;
    //             this.pressingUp = false;
    //             this.pressingLeft = false;
    //             this.pressingRight = false;
    //             break;
    //         case 6:
    //             this.pressingDown = true;
    //             this.pressingUp = false;
    //             this.pressingLeft = true;
    //             this.pressingRight = false;
    //             break;
    //         case 7:
    //             this.pressingDown = false;
    //             this.pressingUp = false;
    //             this.pressingLeft = true;
    //             this.pressingRight = false;
    //             break;
    //         case 8:
    //             this.pressingDown = false;
    //             this.pressingUp = true;
    //             this.pressingLeft = true;
    //             this.pressingRight = false;
    //             break;
    //     }

    //     this.pressingSpace = Math.random() < 0.5;
    //     this.randTime = 1000 * (Math.random() * 3 + 1);
    //     setTimeout(() => this.setRandDirection(), this.randTime);
    // }
}