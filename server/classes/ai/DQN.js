// import { DQNAgent } from "./TFWorker.js";
import { Worker } from "worker_threads";
import { Bot } from "../game-objects/Bot.js";

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const fs = require('fs');

const worker = new Worker("./server/classes/ai/TFWorker.js", {
    workerData: {
        AGENT_STATES_NUM: parseInt(process.env.AGENT_STATES_NUM, 10),
        AGENT_ACTIONS_NUM: parseInt(process.env.AGENT_ACTIONS_NUM, 10),
    },
});

worker.on("message", (msg)=>{
    switch(msg.type){
        case 'action':
            const action = msg.action;
            const move = WalkAgent.moves[action];
            //make move:
            const bot = Bot.list[msg.botID]

            bot.setWalkAction(move);

            if (!bot.lastAction) bot.lastAction = action;

            let reward = bot.getReward();

            if(action == bot.lastAction) reward += 0.1;

            // console.log("reward: ", reward, ' bot: ', bot.id);
            // WalkAgent.recentRewards.push(reward);
            // if (WalkAgent.recentRewards.length > 1000) {
            //     const average = (array) =>
            //         array.reduce((a, b) => a + b) / array.length;
            //     console.log(
            //         `AVARAGE over 1000 REWARDS: ${average(
            //             WalkAgent.recentRewards
            //         )}`
            //     );
            //     fs.writeFileSync(
            //         "logs/rewards.txt",
            //         average(WalkAgent.recentRewards) + "\n",
            //         {
            //             encoding: "utf8",
            //             flag: "a+",
            //             mode: 0o666,
            //         }
            //     );
            //     // console.log(`epsilon: `, this.walkAgent.epsilon);

            //     WalkAgent.recentRewards = [];
            // }
            
            // console.log(
            //     "main sends: ",
            //     bot.lastState,
            //     bot.lastAction,
            //     reward,
            //     bot.state
            // );
            WalkAgent.requestWorkerRemember(
                bot.lastState,
                bot.lastAction,
                reward,
                bot.state,
                bot.isLearningCycleDone,
            )

            if(bot.isLearningCycleDone) bot.startNewLearningCycle();
            // console.log('lastState', bot.lastState, 'lastAction', bot.lastAction,'reward', reward, 'state', bot.state);
            // console.log(reward);

            bot.lastState = bot.state;
            bot.lastAction = action;

            bot.isProcessingStep = false;
            break;
        case 'loss':
            console.log(msg.text)
            break;
    }
})



export class WalkAgent {
    static actionsNum = 9; //8-dir + not moving
    static statesNum = process.env.AGENT_STATES_NUM; //31

    static gridDims = 3; //5x5 grid around agent
    //2:1 grid because of isometric view and proportions:
    // static cellW = 400; //grid cell width
    // static cellH = 200; //grid cell heigth

    static bigStateGrid = {
        cellW: 400,
        cellH: 200,
    };

    static mediumStateGrid = {
        cellW: WalkAgent.bigStateGrid.cellW / 3,
        cellH: WalkAgent.bigStateGrid.cellH / 3,
    };

    static smallStateGrid = {
        cellW: WalkAgent.mediumStateGrid.cellW / 3,
        cellH: WalkAgent.mediumStateGrid.cellH / 3,
    };

    static maxDistSq =
        Math.pow((WalkAgent.gridDims * WalkAgent.bigStateGrid.cellW) / 2, 2) +
        Math.pow((WalkAgent.gridDims * WalkAgent.bigStateGrid.cellH) / 2, 2);
    static maxDX = (WalkAgent.gridDims * WalkAgent.bigStateGrid.cellW) / 2;
    static maxDY = (WalkAgent.gridDims * WalkAgent.bigStateGrid.cellH) / 2;
    static maxDist = Math.sqrt(WalkAgent.maxDistSq);

    static recentRewards = [];

    static moves = [
        { u: false, d: false, l: false, r: false, att: false }, //idle
        { u: true, d: false, l: false, r: false, att: false }, //N
        { u: true, d: false, l: false, r: true, att: false }, //NE
        { u: false, d: false, l: false, r: true, att: false }, //E
        { u: false, d: true, l: false, r: true, att: false }, //SE
        { u: false, d: true, l: false, r: false, att: false }, //S
        { u: false, d: true, l: true, r: false, att: false }, //SW
        { u: false, d: false, l: true, r: false, att: false }, //W
        { u: true, d: false, l: true, r: false, att: false }, //NW
        { u: false, d: false, l: false, r: false, att: true }, //idle & shoot
        { u: true, d: false, l: false, r: false, att: true }, //N & shoot
        { u: true, d: false, l: false, r: true, att: true }, //NE & shoot
        { u: false, d: false, l: false, r: true, att: true }, //E & shoot
        { u: false, d: true, l: false, r: true, att: true }, //SE & shoot
        { u: false, d: true, l: false, r: false, att: true }, //S & shoot
        { u: false, d: true, l: true, r: false, att: true }, //SW & shoot
        { u: false, d: false, l: true, r: false, att: true }, //W & shoot
        { u: true, d: false, l: true, r: false, att: true }, //NW & shoot
        { u: false, d: false, l: false, r: false, att: false, changeWeaponDuration: "shorter" }, //idle & change to shorter weapon duration
        { u: false, d: false, l: false, r: false, att: false, changeWeaponDuration: "longer" }, //idle & change to longer weapon duration
    ];

    constructor(bot) {
        this.bot = bot;
        this.recentRewards = [];
    }

    requestWorkerDecide(state, botID) {
        worker.postMessage({
            type: "decide",
            state: state,
            botID: botID,
        });
    }

    static requestWorkerRemember(lastState, lastAction, reward, state, done) {
        worker.postMessage({
            type: "remember",
            lastState: lastState,
            lastAction: lastAction,
            reward: reward,
            state: state,
            done: done,
        });
    }

    static requestWorkerLogLoss(){
        worker.postMessage({
            type: "logLossAndEps"
        });
    }

    async step() {
        if (this.bot.isProcessingStep) return;
        this.bot.isProcessingStep = true;
        //get state:
        const state = this.bot.getWalkAgentEnvironment();
        this.bot.state = state;
        if (state.length != WalkAgent.statesNum) {
            throw new Error(
                `State array length (${state.length}) is different than DQN input layer length (${WalkAgent.statesNum})`
            );
        }
        if (!this.bot.lastState) this.bot.lastState = state;

        //choose action:
        this.requestWorkerDecide(state, this.bot.id);
        //Request to worker thread is sent,

        //when worker decides:
        // - it sends back the action,
        //   ( worker.on("message",(msg)=>{}), msg.type == action )

        // - Bot applies action,

        // - We get Bot's reward,

        // - We send a remember request to worker thread
        //   (previousAction, previousState, reward, currentState)
    }
}

