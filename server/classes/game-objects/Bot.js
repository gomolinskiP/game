import { Bullet } from "./Bullet.js";
import { Character } from "./Character.js";
import { Weapon } from "./Weapon.js";
import { Map } from "../Map.js";
import { Pickup } from "./Pickup.js";
import { WalkAgent } from "../ai/DQN.js";
import { Tile } from "./Tile.js";
import { Sounds } from "../musical/Sounds.js";
import { stat } from "fs";

import { createRequire } from "module";
import { Entity } from "./Entity.js";
const require = createRequire(import.meta.url);
const fs = require("fs");


const average = (array) => array.reduce((a, b) => a + b) / array.length;
const AvgOfNum = 10000;
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
        const avg = average(this.recentRewards);
        fs.writeFileSync(
            this.logFilePath,
            avg + "\n",
            {
                encoding: "utf8",
                flag: "a+",
                mode: 0o666,
            }
        );

        if (this.logFilePath == "logs/walking_rewards.txt"){
            //so we log loss only once per all the reward types
            WalkAgent.requestWorkerLogLoss();
        }
        if (this.logFilePath == "logs/rewards.txt") {
            const varr =
                this.recentRewards.reduce(
                    (a, b) => a + (b - avg) * (b - avg),
                    0
                ) / this.recentRewards.length;

            fs.writeFileSync("logs/rewards_varr.txt", avg + "\n", {
                encoding: "utf8",
                flag: "a+",
                mode: 0o666,
            });
        }
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

            if(bot.isDead) continue; //skip for dead bots
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
    // static startPosResetTime_ms = 600000; //time after start position is resetted to current position (for dqn map exploration implementation)
    static moveDistGoal = 2000; //max distance from start position, that reaching gives reward and resets start position

    constructor() {
        const { x, y } = Tile.getRandomWalkablePos();

        // x = y = 0;

        let id = Math.random();
        let username = `(●'◡'●)`;
        super(id, x, y, username);

        this.walkAgent = new WalkAgent(this);
        this.walkingReward = 0; //rewards regarding walking itself
        this.pickupsReward = 0; //rewards regarding collecting pickups
        this.stepsSinceLastPickup = 100000000;
        this.combatReward = 0;

        this.agentStepCount = 0;

        this.startX = this.x;
        this.startY = this.y;

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

                let isObjInCell = -1;

                const objCandidates = objQuadtree.retrieve({
                    x: cellX,
                    y: cellY,
                    width: cellW,
                    height: cellH,
                });

                for (const candidate of objCandidates) {
                    if(candidate.parentID == this.id) continue; //(for bullets) skip if bot is bullet's parent
                    if(candidate.id == this.id) continue; //(for characters) skip if self
                    if (
                        candidate.x + candidate.width > cellX &&
                        candidate.x < cellX + cellW &&
                        candidate.y + candidate.height > cellY &&
                        candidate.y < cellY + cellH
                    ) {
                        //object of quadtree is in the cell [i][j]
                        if(candidate.hp) {
                            //object is alive & has HealthPoints

                            //skip if they are in non-pvp area:
                            if(Entity.isInNonPVPArea(candidate.x, candidate.y)) continue;

                            //normalised other player's HP in cell:
                            isObjInCell = candidate.hp / Character.fullHP;
                        }
                        else isObjInCell = 1;
                        //if object is not another player cell state is just 1
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
        resultArray = resultArray.concat(
            this._getGridState(WalkAgent.extraSmallStateGrid, objQuadtree)
        );

        return resultArray;
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

        //self- weapon duration normalised to <-1, 1>:
        state.push(
            2*(Weapon.allowedDurations.indexOf(this.weapon.duration) / (Weapon.allowedDurations.length - 1)) - 1
        );

        //self-info about being in non-PVP area:
        state.push(Number(this.isInNonPVPArea()));
        // console.log("is in non pvp?: ", state.slice(-1).toString());


        //Is shooting on cooldown state:
        state.push(Number(this.hasShotScheduled));

        //add pickup grid state to RL state (is pickup in one of the cells around agent? 0/1):
        const pickupGridState = this.getGridState(Pickup.quadtree);
        state = state.concat(pickupGridState);
        // console.log("pickup grid state: ", state.slice(-36).toString());


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

            let {dx, dy} = this.getDxDy(nearestPickup);

            state.push(dx / WalkAgent.maxDX, dy / WalkAgent.maxDY);
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

        //character grid-state:
        const characterGridState = this.getGridState(Character.quadtree);
        state = state.concat(characterGridState);

        //bullet grid-state:
        const bulletGridState = this.getGridState(Bullet.quadtree);
        state = state.concat(bulletGridState);

        // console.log("bullet grid state: ", state.slice(-36).toString());

        //3 own bullets' distances & normalised bullets' time to live:
        for(let i = 0; i < 3; i++){
            const ownBulletID = this.ownBulletsIDs[i];

            if(ownBulletID == undefined){
                state.push(2, 2);
                state.push(-1);
            }
            else{
                const bullet = Bullet.list[ownBulletID];

                let {dx, dy} = this.getDxDy(bullet);
                state.push(dx / WalkAgent.maxDist, dy / WalkAgent.maxDist);

                const bulletTimeLeft = (bullet.durationMs - (Date.now() - bullet.creationTime)) / bullet.durationMs;
                state.push(bulletTimeLeft);
            }
        }

        // console.log('own bullet distances & ttl: ', state.slice(-8).toString());


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

        // console.log(state.toString(), "\n\n")

        return state;
    }

    setWalkAction(move) {
        // this.needsUpdate = true;

        //walking:
        this.pressingUp = move.u;
        this.pressingDown = move.d;
        this.pressingLeft = move.l;
        this.pressingRight = move.r;

        //shooting:
        if(this.isShooting.state != move.att){
            this.setShootingState(false, this.isShooting.noteID);
            this.setShootingState(move.att, Math.round(7 * Math.random()));
        }

        if(move.changeWeaponDuration){
            // console.log(`setting ${move.changeWeaponDuration} weapon duration`);
            this.changeWeaponDuration(move.changeWeaponDuration);
        }

        this.agentStepCount += 1;
    }

    changeWeaponDuration(direction){
        const currentDuration = this.weapon.duration;
        const durationIndex = Weapon.allowedDurations.indexOf(currentDuration);

        let newDurationIndex;

        switch(direction){
            case "shorter":
                if(durationIndex < Weapon.allowedDurations.length - 1){
                    newDurationIndex = durationIndex + 1;
                }
                else{
                    // console.log('duration cannot be shorter!!');
                    this.combatReward -= 0.5;
                    return;
                }
                break;
            case "longer":
                if(durationIndex > 0){
                    newDurationIndex = durationIndex - 1;
                }
                else{
                    // console.log('duration cannot be longer!!');
                    this.combatReward -= 0.5;
                    return;
                }
                break;
        }
        
        const newDuration = Weapon.allowedDurations[newDurationIndex];
        this.weapon.setDuration(newDuration)
        // console.log(currentDuration, durationIndex, newDurationIndex, newDuration);
    }


    startNewLearningCycle() {
        this.isLearningCycleDone = false;
    }

    driftStartPos(){
        //slowly moves starting position to current bot position,
        //used to encourage map exploration
        this.startX += 2 * Math.sign(this.x - this.startX);
        this.startY += 2 * Math.sign(this.y - this.startY);

        // console.log(
        //     'startPos: ', this.startX, this.startY,
        //     'pos: ', this.x, this.y
        // )
    }

    takeDmg(damage, attacker) {
        super.takeDmg(damage, attacker);

        const dmgReward =  40 * (damage / this.fullHP);
        // console.log('dmgReward', dmgReward);
        this.combatReward -= dmgReward;
        attacker.combatReward += dmgReward;
    }

    die(attacker) {
        super.die(attacker);
        this.combatReward -= 50;
        attacker.combatReward += 50;
        this.isLearningCycleDone = true;

        //random respawn time between 1s and 4s:
        const respawnTimeMs = Math.random() * 3000 + 1000;
        setTimeout(()=>{
            this.spawn();
        }, respawnTimeMs);
    }

    spawn(){
        super.spawn();

        this.stepsSinceLastPickup = 100000000;
        this.agentStepCount = 0;

        const { x, y } = Tile.getRandomWalkablePos();
        this.x = x;
        this.y = y;
    }
    

    // shoot() {
    //     super.shoot();

    //     const noteIndex = Math.round(Math.random() * (Sounds.scale.allowedNotes.length - 1));
    //     this.changeSelectedNote(Sounds.scale.allowedNotes[noteIndex]);

    //     //small negative reward for just shooting - will be positively compensated (4x) if the shot damages other enemy
    //     // const shotReward = -10 * (this.weapon.damage / this.fullHP);
    //     // this.combatReward += shotReward;
    //     // console.log('shooting reward: ', shotReward)

    //     // this.shootAgentReward -= 0.05; //negative reward for just shooting - will be compensated if shot damages other player
    // }

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
        this.driftStartPos();
        if (distTraveled > Bot.moveDistGoal) {
            this.walkingReward += 10;
            this.startX = this.x;
            this.startY = this.y;
        }
        const walkFarReward = 2 * (distTraveled / Bot.moveDistGoal - 0.5);
        // console.log(
        //     "normalised dist: ",
        //     distTraveled / Bot.moveDistGoal - 0.5,
        //     'walkFarReward: ',
        //     walkFarReward
        // );
        this.walkingReward += walkFarReward;

        if(this.walkedIntoCollision){
            this.walkingReward -= 1;
            this.walkedIntoCollision = false;
        }

        // const stillAliveReward = Math.min(
        //     Math.exp(this.agentStepCount / 1000) - 1,
        //     3
        // );
        // this.combatReward += stillAliveReward;
        // // console.log('stillAliveReward: ', stillAliveReward)

        const reward = this.walkingReward + this.pickupsReward + this.combatReward;
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