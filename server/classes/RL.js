// import { DQNAgent } from "./TFAgent.js";
import { Worker } from "worker_threads";
import { Bot } from "./Bot.js";

const worker = new Worker("./server/classes/TFAgent.js", {
    workerData: null,
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

            const reward = bot.getReward();
            
            WalkAgent.requestWorkerRemember(
                bot.lastState,
                bot.lastAction,
                reward,
                bot.state
            )

            bot.lastState = bot.state;
            bot.lastAction = action;
            console.log(`step`)

            break;
        case 'loss':

            break;
    }
})



export class WalkAgent {
    static actionsNum = 9; //8-dir + not moving
    static statesNum = 133; //31

    static gridDims = 5; //5x5 grid around agent
    //2:1 grid because of isometric view and proportions:
    static cellW = 200; //grid cell width
    static cellH = 100; //grid cell heigth

    static maxDistSq =
        Math.pow((WalkAgent.gridDims * WalkAgent.cellW) / 2, 2) +
        Math.pow((WalkAgent.gridDims * WalkAgent.cellH) / 2, 2);
    static maxDX = (WalkAgent.gridDims * WalkAgent.cellW) / 2;
    static maxDY = (WalkAgent.gridDims * WalkAgent.cellH) / 2;
    static maxDist = Math.sqrt(WalkAgent.maxDistSq);

    static moves = [
        { u: false, d: false, l: false, r: false }, //idle
        { u: true, d: false, l: false, r: false }, //N
        { u: true, d: false, l: false, r: true }, //NE
        { u: false, d: false, l: false, r: true }, //E
        { u: false, d: true, l: false, r: true }, //SE
        { u: false, d: true, l: false, r: false }, //S
        { u: false, d: true, l: true, r: false }, //SW
        { u: false, d: false, l: true, r: false }, //W
        { u: true, d: false, l: true, r: false }, //NW
    ];

    // static globalAgent = new DQNAgent(
    //     WalkAgent.statesNum,
    //     WalkAgent.actionsNum
    // );

    constructor(bot) {
        // this.walkAgent = new DQNSolver(WalkAgent.env, WalkAgent.opt);
        // this.walkAgent = agent;
        this.bot = bot;

        this.recentRewards = [];
    }

    requestWorkerDecide(state, botID){
        worker.postMessage({
            type: 'decide',
            state: state,
            botID: botID
        })
    }

    static requestWorkerRemember(lastState, lastAction, reward, state){
        worker.postMessage({
            type: "remember",
            lastState: lastState,
            lastAction: lastAction,
            reward: reward,
            state: state,
        });
    }

    async step() {
        //get state:
        const state = this.bot.getWalkAgentEnvironment();
        this.bot.state = state;
        if (state.length != WalkAgent.statesNum) {
            throw new Error(
                `State array length (${state.length}) is different than DQN input layer length (${WalkAgent.statesNum})`
            );
        }

        // console.log(`state len: ${state.length}, numStates: ${WalkAgent.statesNum}`)

        if (!this.bot.lastState) this.bot.lastState = state;
        // const state = Array(31).fill(0);
        // console.log(state.length, state, WalkAgent.statesNum)

        //choose action:
        this.requestWorkerDecide(state, this.bot.id)

        // const action = this.walkAgent.decide(state);

        // if (!this.lastAction) this.lastAction = action;

        // const move = WalkAgent.moves[action];
        // //make move:
        // this.bot.setWalkAction(move);

        //calculate reward
        // let reward = this.bot.getReward();
        // // console.log(`reward: ${reward}`);

        // if (this.lastAction != action) {
        //     reward -= 0.01;
        // } else {
        //     reward += 0.01;
        // }

        // if(action == 0) reward -= 0.001;

        // console.log(`reward ${reward}`);

        //learn:
        // this.walkAgent.learn(reward);
        // this.walkAgent.remember(this.lastState, this.lastAction, reward, state);
        // await this.walkAgent.replay();
        // this.lastState = state;
        // this.lastAction = action;

        // console.log(this.walkAgent.longTermMemory)

        // console.log("reward: ", reward);
        // this.recentRewards.push(reward);
        // if (this.recentRewards.length > 100) {
        //     const average = (array) =>
        //         array.reduce((a, b) => a + b) / array.length;
        //     console.log(
        //         `AVARAGE over 1000 REWARDS: ${average(
        //             this.recentRewards
        //         )} for bot ${this.bot.id}`
        //     );
        //     console.log(`epsilon: `, this.walkAgent.epsilon);

        //     this.recentRewards = [];
        // }
    }
}

// export class ShootAgent {
//     static actionsNum = 8; //keyboard digits (1-7) + idle
//     static statesNum = 22; //31

//     static gridDims = 5; //5x5 grid around agent
//     //2:1 grid because of isometric view and proportions:
//     static cellW = 200; //grid cell width
//     static cellH = 100; //grid cell heigth

//     static maxDistSq =
//         Math.pow((ShootAgent.gridDims * ShootAgent.cellW) / 2, 2) +
//         Math.pow((ShootAgent.gridDims * ShootAgent.cellH) / 2, 2);
//     static maxDX = (ShootAgent.gridDims * ShootAgent.cellW) / 2;
//     static maxDY = (ShootAgent.gridDims * ShootAgent.cellH) / 2;
//     static maxDist = Math.sqrt(ShootAgent.maxDistSq);

//     static moves = [
//         { shoot: false, key: -1}, //idle
//         { shoot: true, key: 1 }, //idle
//         { shoot: true, key: 2 }, //idle
//         { shoot: true, key: 3 }, //idle
//         { shoot: true, key: 4 }, //idle
//         { shoot: true, key: 5 }, //idle
//         { shoot: true, key: 6 }, //idle
//         { shoot: true, key: 7 }, //idle
//     ];

//     static globalAgent = new DQNAgent(
//         ShootAgent.statesNum,
//         ShootAgent.actionsNum
//     );

//     constructor(bot) {
//         this.shootAgent = ShootAgent.globalAgent;
//         this.bot = bot;

//         this.recentRewards = [];
//     }

//     async step() {
//         //get state:
//         const state = this.bot.getShootAgentEnvironment();
//         if (state.length != ShootAgent.statesNum) {
//             throw new Error(
//                 `State array length (${state.length}) is different than DQN input layer length (${ShootAgent.statesNum})`
//             );
//         }

//         // console.log(`state len: ${state.length}, numStates: ${WalkAgent.statesNum}`)

//         if (!this.lastState) this.lastState = state;
//         // const state = Array(31).fill(0);
//         // console.log(state.length, state, WalkAgent.statesNum)

//         //choose action:
//         const action = this.shootAgent.decide(state);

//         if (!this.lastAction) this.lastAction = action;

//         const move = ShootAgent.moves[action];
//         //make move:
//         this.bot.setShootAction(move);

//         //calculate reward
//         let reward = this.bot.getShootAgentReward();

//         //learn:
//         this.shootAgent.remember(this.lastState, this.lastAction, reward, state);
//         await this.shootAgent.replay();
//         this.lastState = state;
//         this.lastAction = action;

//         // console.log(this.walkAgent.longTermMemory)

//         console.log("shoot reward: ", reward);
//         // this.recentRewards.push(reward);
//         // if (this.recentRewards.length > 100) {
//         //     const average = (array) =>
//         //         array.reduce((a, b) => a + b) / array.length;
//         //     console.log(
//         //         `AVARAGE over 1000 REWARDS: ${average(
//         //             this.recentRewards
//         //         )} for bot ${this.bot.id}`
//         //     );
//         //     console.log(`epsilon: `, this.shootAgent.epsilon);

//         //     this.recentRewards = [];
//         // }
//     }
// }

// class Agent {
//     static actionsNum = 9; //8-dir + not moving
//     static statesNum = 79; //31

//     static gridDims = 5; //5x5 grid around agent
//     //2:1 grid because of isometric view and proportions:
//     static cellW = 200; //grid cell width
//     static cellH = 100; //grid cell heigth

//     static maxDistSq =
//         Math.pow((WalkAgent.gridDims * WalkAgent.cellW) / 2, 2) +
//         Math.pow((WalkAgent.gridDims * WalkAgent.cellH) / 2, 2);
//     static maxDX = (WalkAgent.gridDims * WalkAgent.cellW) / 2;
//     static maxDY = (WalkAgent.gridDims * WalkAgent.cellH) / 2;
//     static maxDist = Math.sqrt(WalkAgent.maxDistSq);

//     constructor(bot) {
//         this.bot = bot;

//         this.statesNum;
//         this.actionsNum;
//     }

//     getEnvironment(bot){
//         bot.getEnvironment();
//     }

//     async step() {
//         //get state:
//         const state = this.getEnvironment(this.bot);
//         if (state.length != this.statesNum) {
//             throw new Error(
//                 `State array length (${state.length}) is different than DQN input layer length (${this.statesNum})`
//             );
//         }

//         // console.log(`state len: ${state.length}, numStates: ${WalkAgent.statesNum}`)

//         if (!this.lastState) this.lastState = state;
//         // const state = Array(31).fill(0);
//         // console.log(state.length, state, WalkAgent.statesNum)

//         //choose action:
//         const action = this.walkAgent.decide(state);

//         if (!this.lastAction) this.lastAction = action;

//         const move = WalkAgent.moves[action];
//         //make move:
//         this.bot.setWalkAction(move);

//         //calculate reward
//         let reward = this.bot.getReward();
//         // console.log(`reward: ${reward}`);

//         if (this.lastAction != action) {
//             reward -= 0.01;
//         } else {
//             reward += 0.01;
//         }

//         // if(action == 0) reward -= 0.001;

//         // console.log(`reward ${reward}`);

//         //learn:
//         // this.walkAgent.learn(reward);
//         this.walkAgent.remember(this.lastState, this.lastAction, reward, state);
//         await this.walkAgent.replay();
//         this.lastState = state;
//         this.lastAction = action;

//         // console.log(this.walkAgent.longTermMemory)

//         console.log("reward: ", reward);
//         this.recentRewards.push(reward);
//         if (this.recentRewards.length > 100) {
//             const average = (array) =>
//                 array.reduce((a, b) => a + b) / array.length;
//             console.log(
//                 `AVARAGE over 1000 REWARDS: ${average(
//                     this.recentRewards
//                 )} for bot ${this.bot.id}`
//             );
//             console.log(`epsilon: `, this.walkAgent.epsilon);

//             this.recentRewards = [];
//         }
//     }
// }
