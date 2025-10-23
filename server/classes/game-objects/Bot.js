import { Bullet } from "./Bullet.js";
import { Character } from "./Character.js";
import { Map } from "../Map.js";
import { Pickup } from "./Pickup.js";
import { WalkAgent } from "../ai/DQN.js";
import { Tile } from "./Tile.js";
import { Sounds } from "../musical/Sounds.js";
import { stat } from "fs";

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const fs = require("fs");


const average = (array) => array.reduce((a, b) => a + b) / array.length;
const AvgOfNum = 1000;
class AvgRewardLogger {
    constructor(logFilePath){
        this.logFilePath = logFilePath;
        this.recentRewards = [];
    }

    push(value){
        this.recentRewards.push(value)
        if(this.recentRewards.length == AvgOfNum){
            this.logAvg();
        }
    }

    logAvg(){
        fs.writeFileSync(
            this.logFilePath,
            average(this.recentRewards) + "\n",
            {
                encoding: "utf8",
                flag: "a+",
                mode: 0o666,
            }
        );

        this.recentRewards = [];
    }
}
const avgWalkingRewardsLogger = new AvgRewardLogger("logs/walking_rewards.txt");
const avgPickupsRewardsLogger = new AvgRewardLogger("logs/pickup_rewards.txt");
const avgCombatRewardsLogger = new AvgRewardLogger("logs/combat_rewards.txt");
const avgTotalRewardsLogger = new AvgRewardLogger("logs/rewards.txt");


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
        }, Bot.agentStepTime_ms);
    }

    static randomSpawn() {
        // random bot spawn:
        if (
            Math.random() < 0.1 &&
            Object.keys(Bot.list).length < Number(process.env.BOT_NUM)
        ) {
            // console.log("bot spawned")
            new Bot();
        }
    }

    static agentStepTime_ms = 250; //time between next dqn agent steps
    static startPosResetTime_ms = 180000; //time after start position is resetted to current position (for dqn map exploration implementation)
    static moveDistGoal = 4000; //max distance from start position, that reaching gives reward and resets start position
    static startPosResetFreq = Bot.startPosResetTime_ms / Bot.agentStepTime_ms; //number of steps between resetting starting position

    constructor() {
        const { x, y } = Tile.getRandomWalkablePos();

        // x = y = 0;

        let id = Math.random();
        let username = `(●'◡'●)`;
        super(id, x, y, username);
        this.speed = 15;

        this.walkAgent = new WalkAgent(this);
        this.walkingReward = 0; //rewards regarding walking itself
        this.pickupsReward = 0; //rewards regarding collecting pickups
        this.stepsSinceLastPickup = 0;
        this.combatReward = 0;

        this.agentStepCount = 0;

        this.setAgentStartPos(x, y);

        this.isLearningCycleDone = false;

        this.characterType = "bot";

        Bot.list[this.id] = this;
    }

    _getGridState(grid, objQuadtree) {
        let resultArray = [];

        const gridDims = WalkAgent.gridDims,
            cellW = grid.cellW,
            cellH = grid.cellH;

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
                    }
                }

                resultArray.push(isObjInCell);
            }
        }
        return resultArray;
    }

    getGridState(objQuadtree) {
        let resultArray = [];

        resultArray = resultArray.concat(
            this._getGridState(WalkAgent.bigStateGrid, objQuadtree)
        );
        resultArray = resultArray.concat(
            this._getGridState(WalkAgent.mediumStateGrid, objQuadtree)
        );
        resultArray = resultArray.concat(
            this._getGridState(WalkAgent.smallStateGrid, objQuadtree)
        );

        // const gridDims = WalkAgent.gridDims,
        //     cellW = WalkAgent.cellW,
        //     cellH = WalkAgent.cellH;
        // const maxDistSq = WalkAgent.maxDistSq;
        // const maxDX = WalkAgent.maxDX,
        //     maxDY = WalkAgent.maxDY;

        // let minDX = maxDX,
        //     minDY = maxDY,
        //     minDistSq = maxDistSq;

        // for (let i = 0; i < gridDims; i++) {
        //     for (let j = 0; j < gridDims; j++) {
        //         const cellX = this.x - (gridDims * cellW) / 2 + j * cellW;
        //         const cellY = this.y - (gridDims * cellH) / 2 + i * cellH;

        //         let isObjInCell = 0;

        //         const objCandidates = objQuadtree.retrieve({
        //             x: cellX,
        //             y: cellY,
        //             width: cellW,
        //             height: cellH,
        //         });

        //         for (const candidate of objCandidates) {
        //             if (
        //                 candidate.x + candidate.width > cellX &&
        //                 candidate.x < cellX + cellW &&
        //                 candidate.y + candidate.height > cellY &&
        //                 candidate.y < cellY + cellH
        //             ) {
        //                 //object of quadtree is in the cell [i][j]
        //                 isObjInCell = 1;
        //                 const dx = this.x - candidate.x + candidate.width / 2;
        //                 const dy = this.y - candidate.y + candidate.height / 2;
        //                 const distSq = dx * dx + dy * dy;

        //                 if (distSq < minDistSq) {
        //                     minDistSq = distSq;
        //                     minDX = dx;
        //                     minDY = dy;
        //                 }
        //             }
        //         }

        //         resultArray.push(isObjInCell);
        //     }
        // }
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

        //self-speed:
        if (isNaN(this.spdX / this.speed)) {
            state.push(0, 0);
        } else {
            state.push(this.spdX / this.speed, this.spdY / this.speed);
        }

        //self distance from starting position:
        state.push(
            (this.x - this.startX) / Bot.moveDistGoal,
            (this.y - this.startY) / Bot.moveDistGoal
        );

        //self normalised HP:
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
                1 - nearestPickupDist / WalkAgent.maxDist;
            // console.log('nearestPickupReward', nearestPickupReward);
            this.pickupsReward += nearestPickupReward;

            const D = this.getDxDy(nearestPickup);
            const pDx = D.dx,
                pDy = D.dy;

            state.push(pDx / WalkAgent.maxDX, pDy / WalkAgent.maxDY);
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

        // //character grid-state
        // const characterGridState = this.getGridState(Character.quadtree);
        // for(const cellState of characterGridState){
        //     if(cellState == 0) this.agentReward += 0.02;
        //     else this.agentReward -= 0.01;
        // }
        // state = state.concat(characterGridState);

        // //2 nearest  other characters:
        // const nearestCharacters = this.findN_Nearest(
        //     3,
        //     Character.quadtree,
        //     Character.list,
        //     WalkAgent.maxDist
        // );
        // for (const nearCharacter of nearestCharacters) {
        //     if (!nearCharacter) {
        //         state.push(2, 2);
        //         this.agentReward += 0.5; //reward for no near character
        //     } else {
        //         const { dx: ch_dx, dy: ch_dy } = this.getDxDy(nearCharacter);
        //         const nearCharDist = Math.sqrt(ch_dx**2 + ch_dy**2);
        //         if(!this.lastNearCharDist) this.lastNearCharDist = nearCharDist;

        //         const deltaNearCharDist = this.lastNearCharDist - nearCharDist;
        //         this.agentReward += deltaNearCharDist/1000;
        //         console.log('delta char dist reward', deltaNearCharDist/1000);

        //         state.push(
        //             ch_dx / WalkAgent.maxDist,
        //             ch_dy / WalkAgent.maxDist
        //         );

        //         //negative reward for being close to other characters:
        //         const otherCharCloseReward =
        //             5 * -(WalkAgent.maxDist - Math.sqrt(ch_dx ** 2 + ch_dy ** 2)) /
        //             WalkAgent.maxDist;
        //         console.log('otherCharCloseReward', otherCharCloseReward);
        //         this.agentReward += otherCharCloseReward;
        //         // console.log('other char close reward', otherCharCloseReward * 5)
        //     }
        // }

        return state;
    }

    setWalkAction(move) {
        this.needsUpdate = true;
        this.pressingUp = move.u;
        this.pressingDown = move.d;
        this.pressingLeft = move.l;
        this.pressingRight = move.r;

        this.agentStepCount += 1;
        if (this.agentStepCount % Bot.startPosResetFreq === 0) {
            this.setAgentStartPos(this.x, this.y);
        }
    }

    startNewLearningCycle() {
        this.isLearningCycleDone = false;
    }

    setAgentStartPos(x, y) {
        this.startX = x;
        this.startY = y;
    }

    takeDmg(damage, attacker) {
        super.takeDmg(damage, attacker);

        this.combatReward -= (10 * damage) / this.fullHP;
    }

    die(attacker) {
        super.die(attacker);
        this.combatReward -= 100;
        this.isLearningCycleDone = true;

        const { x, y } = Tile.getRandomWalkablePos();
        this.x = x;
        this.y = y;
    }

    shoot() {
        super.shoot();

        // this.shootAgentReward -= 0.05; //negative reward for just shooting - will be compensated if shot damages other player
    }

    getReward() {
        //add negative reward if agent is not moving:
        if (Math.abs(this.spdX) < 0.1 && Math.abs(this.spdY) < 0.1) {
            this.walkingReward -= 0.5;
        }

        //add reward for recently found pickup:
        const recentPickupReward = Math.exp(-this.stepsSinceLastPickup / 20);
        // console.log('recentPickupReward', recentPickupReward);
        this.pickupsReward += recentPickupReward;

        //add reward for being far from starting position:
        const distTraveled = this.getDist({ x: this.startX, y: this.startY });
        if (distTraveled > Bot.moveDistGoal) {
            this.setAgentStartPos(this.x, this.y);
            this.agentStepCount = 0;
            this.walkingReward += 2;
        }
        const walkFarReward = 10 * (distTraveled / Bot.moveDistGoal);
        this.walkingReward += walkFarReward;

        const reward = this.walkingReward + this.pickupsReward;
        // fs.writeFileSync(
        //     "logs/rewards_specific.txt",
        //     "reward: " +
        //     reward +
        //     " walkingReward: " +
        //     this.walkingReward +
        //     " pickupsReward: " +
        //     this.pickupsReward +
        //     " combatReward: " +
        //     this.combatReward + "\n",
        //     {
        //         encoding: "utf8",
        //         flag: "a+",
        //         mode: 0o666,
        //     }
        // );

        avgWalkingRewardsLogger.push(this.walkingReward);
        avgPickupsRewardsLogger.push(this.pickupsReward);
        avgCombatRewardsLogger.push(this.combatReward);
        avgTotalRewardsLogger.push(reward);
        this.walkingReward = this.pickupsReward = this.combatReward = 0;
        return reward;
    }
}