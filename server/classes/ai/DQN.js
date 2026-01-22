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
            const move = DQNAgent.moves[action];
            //make move:
            const bot = Bot.list[msg.botID]
            if(!bot) return;

            bot.applyAction_DQN(move);

            if (!bot.lastAction) bot.lastAction = action;

            let reward = bot.getReward();

            // console.log("reward: ", reward, ' bot: ', bot.id);
            // DQNAgent.recentRewards.push(reward);
            // if (DQNAgent.recentRewards.length > 1000) {
            //     const average = (array) =>
            //         array.reduce((a, b) => a + b) / array.length;
            //     console.log(
            //         `AVARAGE over 1000 REWARDS: ${average(
            //             DQNAgent.recentRewards
            //         )}`
            //     );
            //     fs.writeFileSync(
            //         "logs/rewards.txt",
            //         average(DQNAgent.recentRewards) + "\n",
            //         {
            //             encoding: "utf8",
            //             flag: "a+",
            //             mode: 0o666,
            //         }
            //     );
            //     // console.log(`epsilon: `, this.DQNAgent.epsilon);

            //     DQNAgent.recentRewards = [];
            // }
            
            // console.log(
            //     "main sends: ",
            //     bot.lastState,
            //     bot.lastAction,
            //     reward,
            //     bot.state
            // );
            DQNAgent.requestWorkerRemember(
                bot.lastState,
                bot.lastAction,
                reward,
                bot.state,
                bot.isLearningCycleDone,
            )

            if(bot.isLearningCycleDone) {
                bot.startNewLearningCycle();
                // console.log('bot died - new cycle',
                //     'bot HP',
                //     bot.hp,
                //     'reward',
                //     reward
                // );
            }
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



export class DQNAgent {
    static actionsNum = process.env.AGENT_ACTIONS_NUM; //8-dir + not moving
    static statesNum = process.env.AGENT_STATES_NUM; //31

    static gridDims = 3; //5x5 grid around agent
    //2:1 grid because of isometric view and proportions:
    // static cellW = 400; //grid cell width
    // static cellH = 200; //grid cell heigth

    static bigStateGrid = {
        cellW: 800,
        cellH: 400,
    };

    static mediumStateGrid = {
        cellW: DQNAgent.bigStateGrid.cellW / 3,
        cellH: DQNAgent.bigStateGrid.cellH / 3,
    };

    static smallStateGrid = {
        cellW: DQNAgent.mediumStateGrid.cellW / 3,
        cellH: DQNAgent.mediumStateGrid.cellH / 3,
    };

    static extraSmallStateGrid = {
        cellW: DQNAgent.smallStateGrid.cellW / 3,
        cellH: DQNAgent.smallStateGrid.cellH / 3,
    };

    static maxDistSq =
        Math.pow((DQNAgent.gridDims * DQNAgent.bigStateGrid.cellW) / 2, 2) +
        Math.pow((DQNAgent.gridDims * DQNAgent.bigStateGrid.cellH) / 2, 2);
    static maxDX = (DQNAgent.gridDims * DQNAgent.bigStateGrid.cellW) / 2;
    static maxDY = (DQNAgent.gridDims * DQNAgent.bigStateGrid.cellH) / 2;
    static maxDist = Math.sqrt(DQNAgent.maxDistSq);

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
        {
            changeWeaponDuration: "shorter",
        }, //idle & change to shorter weapon duration
        {
            changeWeaponDuration: "longer",
        }, //idle & change to longer weapon duration
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

    static requestWorkerLogLoss() {
        worker.postMessage({
            type: "logLossAndEps",
        });
    }

    async step() {
        if (this.bot.isProcessingStep) return;
        this.bot.isProcessingStep = true;
        //get state:
        const state = this.bot.getDQNAgentEnvironment();
        this.bot.state = state;
        if (state.length != DQNAgent.statesNum) {
            throw new Error(
                `State array length (${state.length}) is different than DQN input layer length (${DQNAgent.statesNum})`
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

