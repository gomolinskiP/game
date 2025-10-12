import { Bullet } from "./Bullet.js";
import { Character } from "./Character.js";
import { Map } from "../Map.js";
import { Pickup } from "./Pickup.js";
import { WalkAgent } from "../ai/DQN.js";
import { Tile } from "./Tile.js";
import { Sounds } from "../musical/Sounds.js";
import { stat } from "fs";


export class Bot extends Character {
    static list = {};

    static stepAll() {
        for (const id in Bot.list) {
            const bot = Bot.list[id];
            // if (Math.random() > 0.9) bot.shoot();
            bot.walkAgent.step();
            bot.stepsSinceLastPickup++;
        }
    }

    static startAgentStep() {
        setInterval(() => {
            Bot.stepAll();
        }, 250);
    }

    static metronomeTick() {
        for (const id in Bot.list) {
            const bot = Bot.list[id];

            //   bot.shootAgent.step();
        }
    }

    constructor() {
        const { x, y } = Tile.getRandomWalkablePos();

        // x = y = 0;

        let id = Math.random();
        let username = `(●'◡'●)`;
        super(id, x, y, username);
        this.speed = 15;

        // this.randTime = 1000*(Math.random() * 3 + 1)
        // setTimeout(()=>this.setRandDirection(), this.randTime);

        this.walkAgent = new WalkAgent(this);
        // this.shootAgent = new ShootAgent(this);
        this.agentReward = 0;
        this.stepsSinceLastPickup = 0;

        this.isLearningCycleDone = false;
        // this.shootAgentReward = 0;

        this.characterType = "bot";

        Bot.list[this.id] = this;
    }

    // updatePosition() {
    //     super.updatePosition();

    //     // const rect = {
    //     //     x: this.x - 250,
    //     //     y: this.y - 250,
    //     //     width: 500,
    //     //     height: 500,
    //     // };

    //     // const pickupCandidates = Pickup.quadtree.retrieve(rect);
    //     // let cumulatedDistSq = 0;
    //     // for (const pickup of pickupCandidates) {
    //     //     if (
    //     //         pickup.x > rect.x &&
    //     //         pickup.x < rect.x + rect.width &&
    //     //         pickup.y > rect.y &&
    //     //         pickup.y < rect.y + rect.height
    //     //     ) {
    //     //         const dx = this.x - pickup.x;
    //     //         const dy = this.y - pickup.y;
    //     //         //cumulated reward for every close pickup
    //     //         const distSq = dx * dx + dy * dy;

    //     //         cumulatedDistSq += distSq;

    //     //         // this.agentReward += Math.min(1, (1 / dx*dx + dy*dy) * 1e-6);
    //     //     }
    //     // }
    //     // if (this.lastCumulatedDistSq) {
    //     //     // this.agentReward +=
    //     //     //     (this.lastCumulatedDistSq - cumulatedDistSq) * 1e-6;
    //     // }
    //     // this.lastCumulatedDistSq = cumulatedDistSq;
    // }

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

    findN_Nearest(N, objQuadtree, objList, maxDist) {
        let nNearest = [];
        const maxDistSq = maxDist ** 2;

        let objCandidates = objQuadtree.retrieve({
            x: this.x - maxDist,
            y: this.y - maxDist,
            width: 2 * maxDist,
            height: 2 * maxDist,
        });

        let minDistSq, nearest;
        while (nNearest.length < N) {
            minDistSq = maxDistSq;
            nearest = null;
            for (const candidate of objCandidates) {
                //skip if found self:
                if (candidate.id == this.id) continue;

                //for bullets - skip if bot is bullets parent
                const obj = objList[candidate.id];
                if (obj && obj.parent && obj.parent.id == this.id) continue;

                const distSq = this.getDistSq(candidate);
                //skip if too far:
                if (distSq > maxDistSq) continue;

                if (distSq < minDistSq) {
                    minDistSq = distSq;
                    nearest = candidate;
                }
            }
            if (nearest) {
                //remove the nearest from
                objCandidates = objCandidates.filter((c) => c !== nearest);
                // console.log('objcandidates length: ',objCandidates.length)

                // const obj = objList[nearest.id];
                nNearest.push({ x: nearest.x, y: nearest.y });
            } else {
                nNearest.push(undefined);
            }
        }
        return nNearest;
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

    getWalkAgentEnvironment() {
        let state = [];

        //self-info
        // state.push(0, 0, this.hp/1000);

        if (isNaN(this.spdX / this.speed)) {
            state.push(0, 0);
        } else {
            state.push(this.spdX / this.speed, this.spdY / this.speed);
        }

        //normalised HP:
        state.push(this.hp / this.fullHP);

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
            // const pickupDistDeltaReward = Math.max(
            //     -1,
            //     Math.min(
            //         1,
            //         (this.lastNearestPickupDist - nearestPickupDist) / 100
            //     )
            // );
            // // console.log(
            // //     "pickupProx reward ",
            // //     -(nearestPickupDist / WalkAgent.maxDist)/10,
            // //     ' dist delta reward ',
            // //     pickupDistDeltaReward
            // // );
            // this.agentReward += pickupDistDeltaReward;
            const nearestPickupReward =
                1 - (nearestPickupDist / WalkAgent.maxDist);
            console.log('nearestPickupReward', nearestPickupReward);
            this.agentReward += nearestPickupReward;

            const D = this.getDxDy(nearestPickup);
            const pDx = D.dx,
                pDy = D.dy;

            if (pDx && pDy) {
                state.push(pDx / WalkAgent.maxDX, pDy / WalkAgent.maxDY);
            } else {
                state.push(2, 2);
            }
        } else {
            state.push(2, 2);
        }

        //tiles:
        //add tile grid state to RL state (is a tile in one of the cells around agent? 0/1):
        const floorTileGridState = this.getGridState(Tile.floorQTree);
        state = state.concat(floorTileGridState);

        // const wallTileGridState = this.getGridState(Tile.wallQTree);
        const nearestWallTiles = this.findN_Nearest(
            4,
            Tile.wallQTree,
            Tile.list,
            WalkAgent.maxDist
        );
        for (const wallTile of nearestWallTiles) {
            if (!wallTile) {
                state.push(2, 2);
            } else {
                const { dx: w_dx, dy: w_dy } = this.getDxDy(wallTile);
                state.push(w_dx / WalkAgent.maxDist, w_dy / WalkAgent.maxDist);
            }
        }

        //character grid-state
        const characterGridState = this.getGridState(Character.quadtree);
        for(const cellState of characterGridState){
            if(cellState == 0) this.agentReward += 0.02;
            else this.agentReward -= 0.01;
        }
        state = state.concat(characterGridState);

        //2 nearest  other characters:
        const nearestCharacters = this.findN_Nearest(
            3,
            Character.quadtree,
            Character.list,
            WalkAgent.maxDist
        );
        for (const nearCharacter of nearestCharacters) {
            if (!nearCharacter) {
                state.push(2, 2);
                this.agentReward += 0.5; //reward for no near character
            } else {
                const { dx: ch_dx, dy: ch_dy } = this.getDxDy(nearCharacter);
                const nearCharDist = Math.sqrt(ch_dx**2 + ch_dy**2);
                if(!this.lastNearCharDist) this.lastNearCharDist = nearCharDist;

                const deltaNearCharDist = this.lastNearCharDist - nearCharDist;
                this.agentReward += deltaNearCharDist/1000;
                console.log('delta char dist reward', deltaNearCharDist/1000);

                state.push(
                    ch_dx / WalkAgent.maxDist,
                    ch_dy / WalkAgent.maxDist
                );

                //negative reward for being close to other characters:
                const otherCharCloseReward =
                    5 * -(WalkAgent.maxDist - Math.sqrt(ch_dx ** 2 + ch_dy ** 2)) /
                    WalkAgent.maxDist;
                console.log('otherCharCloseReward', otherCharCloseReward);
                this.agentReward += otherCharCloseReward;
                // console.log('other char close reward', otherCharCloseReward * 5)
            }
        }

        //2 nearest bullets:
        // const nearestBullets = this.findN_Nearest(
        //     2,
        //     Bullet.quadtree,
        //     Bullet.list,
        //     WalkAgent.maxDist
        // );
        // for (const nearBullet of nearestBullets) {
        //     if (!nearBullet) {
        //         state.push(1, 1);
        //     } else {
        //         const { dx: b_dx, dy: b_dy } = this.getDxDy(nearBullet);
        //         state.push(b_dx / WalkAgent.maxDist, b_dy / WalkAgent.maxDist);

        //         //negative reward for being close to other bullets:
        //         const otherBulletCloseReward =
        //             -(WalkAgent.maxDist - Math.sqrt(b_dx ** 2 + b_dy ** 2)) /
        //             WalkAgent.maxDist;
        //         // console.log(otherBulletCloseReward);
        //         this.agentReward += otherBulletCloseReward;
        //     }
        // }

        // console.log(state.slice(-8).toString());
        // state = state.concat(wallTileGridState);

        //bullet:
        // const bulletGridState = this.getGridState(Bullet.quadtree);
        // state = state.concat(bulletGridState);

        // const nearestBullet = this.findNearest(
        //     Bullet.list,
        //     Bullet.quadtree,
        //     WalkAgent.maxDist
        // );
        // if (nearestBullet) {
        //     const nearestBulletDist = this.getDist(nearestBullet);
        //     if (!this.lastNearestBulletDist) {
        //         this.lastNearestBulletDist = nearestBulletDist;
        //     }

        //     //reward for getting closer to/further from the nearest pickup (negative if closer, positive if further):
        //     const bulletDistDeltaReward = Math.max(
        //         -1,
        //         Math.min(
        //             1,
        //             (this.lastNearestBulletDist - nearestBulletDist) / 1000
        //         )
        //     );
        //     this.agentReward -= bulletDistDeltaReward;

        //     const D = this.getDxDy(nearestBullet);
        //     const pDx = D.dx,
        //         pDy = D.dy;

        //     if (pDx && pDy) {
        //         state.push(pDx / WalkAgent.maxDX, pDy / WalkAgent.maxDY);
        //     } else {
        //         state.push(1, 1);
        //     }
        // } else {
        //     state.push(1, 1);
        // }

        // // //character:
        // const characterGridState = this.getGridState(Character.quadtree);
        // state = state.concat(characterGridState);

        // const nearestCharacter = this.findNearest(
        //     Character.list,
        //     Character.quadtree,
        //     WalkAgent.maxDist
        // );
        // if (nearestCharacter) {
        //     const nearestCharacterDist = this.getDist(nearestCharacter);
        //     if (!this.lastNearestCharacterDist) {
        //         this.lastNearestCharacterDist = nearestCharacterDist;
        //     }

        //     //reward for getting closer to/further from the nearest pickup (negative if closer, positive if further):
        //     const characterDistDeltaReward = Math.max(
        //         -1,
        //         Math.min(
        //             1,
        //             (this.lastNearestCharacterDist - nearestCharacterDist) / 1000
        //         )
        //     );
        //     this.agentReward -= characterDistDeltaReward;

        //     const D = this.getDxDy(nearestCharacter);
        //     const pDx = D.dx,
        //         pDy = D.dy;

        //     if (pDx && pDy) {
        //         state.push(pDx / WalkAgent.maxDX, pDy / WalkAgent.maxDY);
        //     } else {
        //         state.push(1, 1);
        //     }
        // } else {
        //     state.push(1, 1);
        // }

        return state;
    }

    setWalkAction(move) {
        this.needsUpdate = true;
        this.pressingUp = move.u;
        this.pressingDown = move.d;
        this.pressingLeft = move.l;
        this.pressingRight = move.r;
    }

    startNewLearningCycle(){
        this.isLearningCycleDone = false;
    }

    // getShootAgentEnvironment(){
    //     //players, bullets, walls, server time, self-hp, player-hp, self-weapon
    //     let state = []

    //     //self-hp:
    //     state.push(this.hp / this.fullHP);

    //     //3 closest players - dx, dy, hp:
    //     const nearestCharacters = this.findN_Nearest(3, Character.quadtree, Character.list, ShootAgent.maxDist);
    //     for(const character of nearestCharacters){
    //         if(!character){
    //             state.push(
    //                 1, //instead of normalised dx
    //                 1, //instead of normalised dy
    //                 -1 //instead of other character normalised HP
    //             )
    //         }
    //         else{
    //             const {dx, dy} = this.getDxDy(character);
    //             state.push(
    //                 dx / ShootAgent.maxDX,
    //                 dy / ShootAgent.maxDY,
    //                 character.hp / character.fullHP,
    //             )
    //         }
    //     }

    //     //3 closest bullets - dx, dy, note as number:
    //     const nearestBullets = this.findN_Nearest(3, Bullet.quadtree, Bullet.list, ShootAgent.maxDist);
    //     for(const bullet of nearestBullets){
    //         if(!bullet){
    //             state.push(
    //                 1,
    //                 1,
    //                 -1,
    //             )
    //         }
    //         else{
    //             const {dx, dy} = this.getDxDy(bullet);
    //             state.push(
    //                 dx / ShootAgent.maxDX,
    //                 dy / ShootAgent.maxDY,
    //                 Sounds.scale.allowedNotes.indexOf(bullet.note) / Sounds.scale.allowedNotes.length
    //             )
    //         }
    //     }

    //     //wall grid-state:

    //     //self weapon:
    //     const normWeaponDuration = this.weapon.durationInt / 8;
    //     const normDurationType = this.weapon.durationType=="normal" ? 0 : 1;
    //     state.push(normWeaponDuration, normDurationType);

    //     //timing:
    //     const timeInaccuracy = Sounds.evaluateNoteTimingAccuracy(this.weapon.duration, this.weapon.durationType);
    //     state.push(timeInaccuracy / this.weapon.durationMs);

    //     console.log("shoot agent state", state);
    //     return state;
    // }

    // setShootAction(move){
    //     if(!move.shoot){
    //         return;
    //     }
    //     else{
    //         const note = Sounds.scale.allowedNotes[move.key - 1];
    //         this.changeSelectedNote(note);
    //         this.shoot();
    //     }
    // }

    takeDmg(damage, attacker) {
        super.takeDmg(damage, attacker);

        this.agentReward -= (10 * damage) / this.fullHP;

        // this.shootAgentReward -= damage/1000;
        // if(attacker.shootAgentReward) attacker.shootAgentReward += damage/1000;
    }

    die(attacker) {
        super.die(attacker);
        this.agentReward -= 100;
        this.isLearningCycleDone = true;

        const { x, y } = Tile.getRandomWalkablePos();
        this.x = x;
        this.y = y;

        // this.shootAgentReward -= 1;
        // if (attacker.shootAgentReward)
        //     attacker.shootAgentReward += 1;
    }

    shoot() {
        super.shoot();

        this.shootAgentReward -= 0.05; //negative reward for just shooting - will be compensated if shot damages other player
    }

    // getShootAgentReward(){
    //     const reward = this.shootAgentReward;
    //     this.shootAgentReward = 0;
    //     return reward;
    // }

    getReward() {
        //add negative reward if agent is not moving:
        if (Math.abs(this.spdX) < 0.1 && Math.abs(this.spdY) < 0.1) {
            this.agentReward -= 0.5;
        }

        //add reward for recently found pickup:
        const recentPickupReward = Math.exp(-this.stepsSinceLastPickup / 20);
        // Math.max(
        //     0,
        //     Math.min(
        //         1,
        //         1 - this.stepsSinceLastPickup * 0.01
        //     )
        // );
        console.log('recentPickupReward', recentPickupReward);
        this.agentReward += recentPickupReward;

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