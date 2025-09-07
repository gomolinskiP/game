import pkg from "reinforce-js";
import { DQNAgent } from "./TFAgent.js";
const { DQNSolver, DQNEnv, DQNOpt } = pkg;


let recentRewards = [];

export class WalkAgent {
    static actionsNum = 9; //8-dir + not moving
    static statesNum = 79; //31

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

    static env = (() => {
        const env = new DQNEnv();
        env.width = 400;
        env.height = 400;
        env.numberOfStates = WalkAgent.statesNum;
        env.numberOfActions = WalkAgent.actionsNum;
        return env;
    })();

    static opt = (() => {
        const opt = new DQNOpt();
        opt.setTrainingMode(true);
        opt.setNumberOfHiddenUnits([64]); // mind the array here, currently only one layer supported! Preparation for DNN in progress...
        opt.setEpsilonDecay(1.0, 0.1, 1e4);
        // opt.setEpsilon(0.05);
        opt.setGamma(0.9);
        opt.setAlpha(0.005);
        opt.setLossClipping(false);
        opt.setLossClamp(2.0);
        opt.setRewardClipping(false);
        opt.setRewardClamp(2.0);
        opt.setExperienceSize(1e5);
        opt.setReplayInterval(10);
        opt.setReplaySteps(20);

        return opt;
    })();

    static globalAgent = new DQNSolver(WalkAgent.env, WalkAgent.opt);

    constructor(bot) {
        // this.walkAgent = new DQNSolver(WalkAgent.env, WalkAgent.opt);
        this.walkAgent = new DQNAgent(
            WalkAgent.statesNum,
            WalkAgent.actionsNum
        );
        this.bot = bot;

        this.recentRewards = [];
    }

    async step() {
        //get state:
        const state = this.bot.getEnvironment();
        if (state.length != WalkAgent.statesNum) {
            throw new Error(
                `State array length (${state.length}) is different than DQN input layer length (${WalkAgent.statesNum})`
            );
        }

        // console.log(`state len: ${state.length}, numStates: ${WalkAgent.statesNum}`)

        if (!this.lastState) this.lastState = state;
        // const state = Array(31).fill(0);
        // console.log(state.length, state, WalkAgent.statesNum)

        //choose action:
        const action = this.walkAgent.decide(state);

        if (!this.lastAction) this.lastAction = action;

        const move = WalkAgent.moves[action];
        //make move:
        this.bot.setWalkAction(move);

        //calculate reward
        let reward = this.bot.getReward();
        // console.log(`reward: ${reward}`);

        if (this.lastAction != action) {
            reward -= 0.01;
        } else {
            reward += 0.01;
        }

        // if(action == 0) reward -= 0.001;

        // console.log(`reward ${reward}`);

        //learn:
        // this.walkAgent.learn(reward);
        this.walkAgent.remember(this.lastState, this.lastAction, reward, state);
        await this.walkAgent.replay();
        this.lastState = state;
        this.lastAction = action;

        // console.log(this.walkAgent.longTermMemory)

        console.log("reward: ", reward);
        this.recentRewards.push(reward);
        if (this.recentRewards.length > 100) {
            const average = (array) =>
                array.reduce((a, b) => a + b) / array.length;
            console.log(
                `AVARAGE over 1000 REWARDS: ${average(
                    this.recentRewards
                )} for bot ${this.bot.id}`
            );
            console.log(`epsilon: `, this.walkAgent.epsilon);

            this.recentRewards = [];
        }
    }
}
