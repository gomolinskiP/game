import * as tf from "@tensorflow/tfjs-node";
import { NoisyDense } from "./NoisyDense.js";
import { parentPort, workerData } from "worker_threads";

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const fs = require('fs');

import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const modelDir = path.resolve(__dirname, "models");
if (!fs.existsSync(modelDir)) fs.mkdirSync(modelDir, { recursive: true });
const mainPath = path.join(modelDir, "main/model.json");
const targetPath = path.join(modelDir, "target/model.json");
const metaPath = path.join(modelDir, "meta.json");

const IS_BOT_TRAINING_MODE = Boolean(Number(process.env.BOT_TRAINING));  

parentPort.on('message', async(msg)=>{
    if(!agent) return;

    switch(msg.type){
        case 'decide':
            const action = agent.decide(msg.state, msg.botID);

            parentPort.postMessage({
                type: 'action',
                action: action,
                botID: msg.botID
            })
            break;
        case 'remember':
            // console.log('worker gets: ', msg.lastState, msg.lastAction, msg.reward, msg.state);
            await agent.remember(msg.lastState, msg.lastAction, msg.reward, msg.state, msg.done);
            break;
        case 'logLossAndEps':
            //log avarage loss, Qval data & TDerror data:
            lossLogger.logAvg();

            minQLogger.logAvg();
            maxQLogger.logAvg();
            meanQLogger.logAvg();

            maxTDLogger.logAvg();
            meanTDLogger.logAvg();

            //log current epsilon:
            fs.writeFileSync(
                "logs/epsilon.txt",
                agent.epsilon + "\n",
                {
                    encoding: "utf8",
                    flag: "a+",
                    mode: 0o666,
                }
            );
            break;
        }
})

const average = (array) => array.reduce((a, b) => a + b) / array.length;
const AvgOfNum = 10000;
class AvgLogger {
    constructor(logFilePath){
        this.logFilePath = logFilePath;
        this.recent = [];
    }

    push(value){
        this.recent.push(value)
    }

    logAvg(){
        if (this.recent.length === 0) return;

        fs.writeFileSync(
            this.logFilePath,
            average(this.recent) + "\n",
            {
                encoding: "utf8",
                flag: "a+",
                mode: 0o666,
            }
        );

        this.recent = [];


        if(this.logFilePath == "logs/loss.txt"){
            ActionLogger.log();
        }
    }
}

const lossLogger = new AvgLogger("logs/loss.txt");

const minQLogger = new AvgLogger("logs/minQ.txt");
const maxQLogger = new AvgLogger("logs/maxQ.txt");
const meanQLogger = new AvgLogger("logs/meanQ.txt");

const maxTDLogger = new AvgLogger("logs/maxTD.txt");
const meanTDLogger = new AvgLogger("logs/meanTD.txt");

class ActionLogger {
    static totalNum = 0;
    static actionsNum = parseInt(process.env.AGENT_ACTIONS_NUM, 10);
    static chosenActionNum = [];

    static init() {
        ActionLogger.totalNum = 0;
        ActionLogger.chosenActionNum = new Array(ActionLogger.actionsNum).fill(
            0
        );
    }

    static push(action) {
        if (action < 0 || action >= ActionLogger.actionsNum) {
            console.warn("Unknown action:", action);
            return;
        }

        ActionLogger.totalNum++;
        ActionLogger.chosenActionNum[action]++;
    }

    static log() {
        if (ActionLogger.totalNum === 0) {
            return;
        }

        let histogram = "";

        for (let i = 0; i < ActionLogger.actionsNum; i++) {
            const percentage = (
                (ActionLogger.chosenActionNum[i] / ActionLogger.totalNum) *
                100
            ).toFixed(2);

            histogram += `${i}:${percentage}|`;
        }

        fs.writeFileSync("logs/actions_hist.txt", histogram + "\n", {
            encoding: "utf8",
            flag: "a+",
            mode: 0o666,
        });

        ActionLogger.init();
    }
}
ActionLogger.init();

class ReplayBuffer{
    constructor(size){
        this.size = size;
        this.buffer = [];
    }

    add(experience){
        if(this.buffer.length >= this.size) this.buffer.shift();
        this.buffer.push(experience);
    }

    sample(batchSize){
        const idx = [];
        while(idx.length < batchSize){
            idx.push(Math.floor(Math.random() * this.buffer.length));
        }

        return idx.map(i => this.buffer[i]);
    }

    get length(){
        return this.buffer.length;
    }
}

// class PrioritizedReplayBuffer{
//     constructor(capacity, priorityAlpha = 0.6, betaStart = 0.4, betaFrames = 100000){
//         this.capacity = capacity;
//         this.buffer = [];
//         this.priorities = [];
//         this.position = 0;
//         this.priorityAlpha = priorityAlpha;
//         this.betaStart = betaStart;
//         this.betaFrames = betaFrames;
//         this.frame = 1;
//     }

//     add(experience){
//         const maxPrio = this.priorities.length > 0
//             ? Math.max(...this.priorities)
//             : 1.0;
//         // console.log(maxPrio);


//         if(this.buffer.length < this.capacity){
//             this.buffer.push(experience);
//             this.priorities.push(maxPrio);
//         } else{
//             this.buffer[this.position] = experience;
//             this.priorities[this.position] = maxPrio;
//         }

//         this.position = (this.position + 1) % this.capacity;
//     }

//     sample(batchSize){
//         //getting propabilities from priorities:
//         const prios = this.priorities.map(p => Math.pow(p, this.priorityAlpha));
//         const sumP = prios.reduce((a, b) => a+b, 0);
//         const probs = prios.map(p => p/sumP);

//         //getting random experiences by propabilities:
//         const indices = [];
//         for(let i=0; i<batchSize; i++){
//             const rand = Math.random();
//             let cumSum = 0;
//             for(let j=0; j<probs.length; j++){
//                 cumSum += probs[j];
//                 if(rand <= cumSum){
//                     indices.push(j);
//                     break;
//                 }
//             }
//         }

//         //increase beta with each batch:
//         const beta = Math.min(
//             1.0,
//             this.betaStart + this.frame * (1.0 - this.betaStart) / this.betaFrames
//         );
//         this.frame++;

//         //weight correction:
//         const weights = indices.map(i => Math.pow(this.buffer.length * probs[i], -beta));
//         const maxW = Math.max(...weights);
//         const normWeights = weights.map(w => w/maxW);

//         const samples = indices.map(i => this.buffer[i]);

//         return {samples, indices, weights: normWeights};
//     }

//     updatePriorities(indices, tdErrors){
//         const absErrors = tdErrors.map(e => Math.abs(e) + 1e-5);
//         // const maxErr = Math.max(...absErrors);

//         for(let i=0; i<indices.length; i++){
//             const idx = indices[i];
//             const scaled = Math.log1p(absErrors[i]); 
//             this.priorities[idx] = Math.max(
//                 scaled,
//                 0.05
//             );
//         }

//         if(this.frame % 1000 == 0){
//             fs.writeFileSync(
//                 "logs/priorities.txt",
//                 "mean priority " +
//                 (this.priorities.reduce((a, b) => a + b) / this.priorities.length) +
//                 " maxP " + 
//                 Math.max(...this.priorities) +
//                 " minP " +
//                 Math.min(...this.priorities) + "\n",
//                 {
//                     encoding: "utf8",
//                     flag: "a+",
//                     mode: 0o666,
//                 }
//             );
//         }

//         // console.log(
//             // "mean priority",
//             // this.priorities.reduce((a, b) => a + b) / this.priorities.length,
//             // 'maxP',
//             // Math.max(...this.priorities),
//             // 'minP',
//             // Math.min(...this.priorities)
//         // );
//     }

//     get length(){
//         return this.buffer.length;
//     }
// }

export class DQNModel {
    constructor(
        numStates,
        numActions,
        {
            gamma = 0.98,
            epsilonStart = 1.0,
            epsilonEnd = 0.05,
            epsilonDecaySteps = 8e6,
            learningRate = 0.00005,
            batchSize = 1024,
            bufferSize = 400000,
            targetUpdateFreq = 3000,
            experienceReplayFreq = 100,
            hiddenLayers = [512, 256, 128],
        } = {}
    ) {
        this.numStates = numStates;
        this.numActions = numActions;
        this.gamma = gamma;
        this.epsilonStart = epsilonStart;
        this.epsilonEnd = epsilonEnd;
        this.epsilonDecaySteps = epsilonDecaySteps;
        this.learningRate = learningRate;
        this.batchSize = batchSize;
        this.targetUpdateFreq = targetUpdateFreq;
        this.experienceReplayFreq = experienceReplayFreq;

        this.stepCounter = 0;
        this.rememberCounter = 0;
        this.replayBuffer = new ReplayBuffer(bufferSize);

        this.epsilon = epsilonStart;

        this.tempEpsilon = 0.0;
        this.tempEpsilonStepsLeft = 0;

        this.modelsReady = false;
        if (fs.existsSync(mainPath) && fs.existsSync(targetPath)) {
            console.log("[DDQN] Loading existing models...");
            this._loadModels(hiddenLayers);
        } else {
            console.log("[DDQN] No saved models found, creating new ones...");
            this.model = this._createModel(hiddenLayers);
            this.targetModel = this._createModel(hiddenLayers);
            this.updateTargetNetwork();
        }
        this.modelsReady = true;
        // this.model = this._createModel(hiddenLayers);
        // this.targetModel = this._createModel(hiddenLayers);
        // this.updateTargetNetwork();
    }

    _createModel(hiddenLayers) {
        const model = tf.sequential();
        hiddenLayers.forEach((units, i) => {
            model.add(
                // new NoisyDense({
                tf.layers.dense({
                    units,
                    activation: "relu",
                    inputShape: i === 0 ? [this.numStates] : undefined,
                    sigmaInit: 0.017,
                })
            );
        });
        model.add(
            // new NoisyDense({
            tf.layers.dense({
                units: this.numActions,
                sigmaInit: 0.017,
            })
        );
        model.compile({
            optimizer: tf.train.adam(this.learningRate),
            loss: "meanSquaredError",
        });
        return model;
    }

    async _loadModels(hiddenLayers) {
        try {
            this.model = await tf.loadLayersModel(`file://${mainPath}`);
            this.targetModel = await tf.loadLayersModel(`file://${targetPath}`);
            this.model.compile({
                optimizer: tf.train.adam(this.learningRate),
                loss: "meanSquaredError",
            });
            this.targetModel.compile({
                optimizer: tf.train.adam(this.learningRate),
                loss: "meanSquaredError",
            });
            if (fs.existsSync(metaPath)) {
                const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
                this._restoreMeta(meta);
            } else {
                console.warn(
                    "[DDQN] No meta.json found — using default parameters."
                );
            }
            console.log("[DDQN] Models loaded successfully.");

            this.loadReplayBuffer();
        } catch (err) {
            console.error("[DDQN] Error loading models:", err);
            console.log("[DDQN] Creating new models instead.");
            this.model = this._createModel(hiddenLayers);
            this.targetModel = this._createModel(hiddenLayers);
            this.updateTargetNetwork();
        }
    }

    _restoreMeta(meta) {
        this.stepCounter = meta.step ?? 0;
        this.epsilon = meta.epsilon ?? this.epsilonStart;
        this.learningRate = meta.learningRate ?? this.learningRate;
        this.gamma = meta.gamma ?? this.gamma;
        this.lastSave = meta.timestamp ?? null;

        console.log(
            `[DDQN] Restored meta: step=${
                this.stepCounter
            }, epsilon=${this.epsilon.toFixed(3)}`
        );
    }

    updateTargetNetwork() {
        this.targetModel.setWeights(this.model.getWeights());
    }

    decide(state) {
        this.stepCounter++;

        let epsilon;
        // not used in noisy-nets:
        epsilon = this.epsilon = Math.max(
            this.epsilonEnd,
            this.epsilonStart -
                (this.stepCounter / this.epsilonDecaySteps) *
                    (this.epsilonStart - this.epsilonEnd)
        );

        //temp epsilon even in noisy-nets:
        if(this.tempEpsilonStepsLeft > 0){
            epsilon = Math.max(this.epsilon, this.tempEpsilon);
            this.tempEpsilonStepsLeft -= 1;
        }
        


        let action;

        if (Math.random() < epsilon) {
            action = Math.floor(Math.random() * this.numActions);
        } else {
            // KLUCZ: jedna próbka szumu na jedną decyzję
            this.model.layers.forEach((l) => {
                if (typeof l.resetNoise === "function") {
                    l.resetNoise();
                }
            });

            tf.tidy(() => {
                const stateTensor = tf.tensor2d([state], [1, this.numStates]);
                const qValues = this.model.predict(stateTensor);
                const actionTensor = qValues.argMax(-1);
                action = actionTensor.dataSync()[0];

                // ręczne dispose
                actionTensor.dispose();
                qValues.dispose();
            });
        }

        ActionLogger.push(action);
        return action;
    }

    async remember(state, action, reward, nextState, done) {
        this.replayBuffer.add({ state, action, reward, nextState, done });

        if(!IS_BOT_TRAINING_MODE) return;
        this.rememberCounter++;
        if (this.rememberCounter % this.targetUpdateFreq === 0) {
            this.updateTargetNetwork();
            console.log("updating target network");
        }

        if (
            this.rememberCounter % this.experienceReplayFreq === 0 &&
            this.rememberCounter >= 2000
        ) {
            await this.replay();
        }
    }

    enableTemporaryEpsilon(epsilon, steps){
        //enables temporary epsilon (random action propability) for a set number of steps:

        this.tempEpsilon = epsilon;
        this.tempEpsilonStepsLeft = steps;
    }

    async replay() {
        

        if (this.replayBuffer.length < this.batchSize) return;

        if (!this.isTraining) {
            const startT = process.hrtime.bigint();
            this.isTraining = true;

            // console.log("replay started");
            // const {samples, indices, weights} = this.replayBuffer.sample(this.batchSize);
            const batch = this.replayBuffer.sample(this.batchSize);

            const states = batch.map((e) => e.state);
            const nextStates = batch.map((e) => e.nextState);

            if (!states.every((s) => s.every((v) => isFinite(v)))) {
                console.log(states);
                throw new Error("Non-finite state detected");
            }

            const statesTensor = tf.tensor2d(states, [
                batch.length,
                this.numStates,
            ]);
            const nextStatesTensor = tf.tensor2d(nextStates, [
                batch.length,
                this.numStates,
            ]);

            //freeze noise:
            this.model.layers.forEach((layer) => {
                if (layer.resetNoise) layer.resetNoise();
            });

            this.targetModel.layers.forEach((layer) => {
                if (layer.resetNoise) layer.resetNoise();
            });

            const {
                qValuesArray,
                qValuesNextMainArray,
                qValuesNextTargetArray,
            } = tf.tidy(() => {
                const qValues = this.model.predict(statesTensor);
                const qValuesNextMain = this.model.predict(nextStatesTensor);
                const qValuesNextTarget =
                    this.targetModel.predict(nextStatesTensor);

                return {
                    qValuesArray: qValues.arraySync(),
                    qValuesNextMainArray: qValuesNextMain.arraySync(),
                    qValuesNextTargetArray: qValuesNextTarget.arraySync(),
                };
            });

            //for Q-val logging:
            const { meanQ, minQ, maxQ } = tf.tidy(() => {
                const qTensor = this.model.predict(statesTensor);
                const maxQs = qTensor.max(1);

                return {
                    meanQ: maxQs.mean().dataSync()[0],
                    minQ: maxQs.min().dataSync()[0],
                    maxQ: maxQs.max().dataSync()[0],
                };
            });

            meanQLogger.push(meanQ);
            minQLogger.push(minQ);
            maxQLogger.push(maxQ);

            const tdErrors = [];

            for (let i = 0; i < batch.length; i++) {
                const { action, reward, done } = batch[i];

                const bestAction = qValuesNextMainArray[i].indexOf(
                    Math.max(...qValuesNextMainArray[i])
                );
                const targetQValue = qValuesNextTargetArray[i][bestAction];

                const target = done
                    ? reward
                    : reward + this.gamma * targetQValue;

                const tdError = target - qValuesArray[i][action];
                tdErrors.push(tdError);

                if (isFinite(target)) {
                    qValuesArray[i][action] = target;
                } else {
                    console.error("Target NaN at", i, {
                        reward,
                        done,
                        targetQValue,
                    });
                }
            }

            //for tdErrors logging:
            const absTD = tdErrors.map((x) => Math.abs(x));
            const meanTD = absTD.reduce((a, b) => a + b, 0) / absTD.length;
            const maxTD = Math.max(...absTD);

            meanTDLogger.push(meanTD);
            maxTDLogger.push(maxTD);

            const updatedTensor = tf.tensor2d(qValuesArray, [
                batch.length,
                this.numActions,
            ]);

            const history = await this.model.fit(statesTensor, updatedTensor, {
                epochs: 1,
                verbose: 0,
            });
            const loss = history.history.loss[0];
            lossLogger.push(loss);

            // this.model.layers.forEach((l) => {
            //     if (l.muWeight) {
            //         console.log(
            //             "mu mean",
            //             l.muWeight.read().abs().mean().dataSync()
            //         );
            //         console.log(
            //             "sigma mean",
            //             l.sigmaWeight.read().mean().dataSync()
            //         );
            //     }
            // });

            tf.dispose([
                statesTensor,
                nextStatesTensor,
                // qValues,
                // qValuesNextMain,
                // qValuesNextTarget,
                updatedTensor,
            ]);

            if(!this.lastSaveTime) this.lastSaveTime = Date.now();
            if (Date.now() > this.lastSaveTime + 1_800_000) { //save every 30min (1.8M ms)
                this.updateTargetNetwork();
                this.save();
                this.lastSaveTime = Date.now();
            }

            const endT = process.hrtime.bigint()
            // console.log('replay end! time: ', endT-startT)

            this.isTraining = false;
            console.log("TF memory:", tf.memory());
        }
    }

    async save() {
        await this.model.save(`file://${path.join(modelDir, "main")}`);
        await this.targetModel.save(`file://${path.join(modelDir, "target")}`);

        const meta = {
            step: this.stepCounter,
            epsilon: this.epsilon,
            learningRate: this.learningRate,
            gamma: this.gamma,
            timestamp: new Date().toISOString(),
        };
        fs.writeFileSync(
            path.join(modelDir, "meta.json"),
            JSON.stringify(meta, null, 2)
        );
        console.log("[DDQN] Models and meta saved.");

        await this.saveReplayBuffer();
    }

    async saveReplayBuffer() {
        const filePath = path.join(modelDir, "replay.bin");
        const validExps = this.replayBuffer.buffer.filter(
            (e) => e && e.state && e.nextState && typeof e.action === "number"
        );

        if (validExps.length === 0) {
            console.warn(
                "[DDQN] Replay buffer empty or invalid — skipping save."
            );
            return;
        }

        const numStates = validExps[0].state.length;
        const recordSize = (numStates * 2 + 3) * 4;
        const buffer = Buffer.allocUnsafe(validExps.length * recordSize);
        let offset = 0;

        for (let i = 0; i < validExps.length; i++) {
            const exp = validExps[i];
            if (!exp) continue;

            // zapis state
            for (let j = 0; j < numStates; j++) {
                buffer.writeFloatLE(exp.state[j] ?? 0, offset);
                offset += 4;
            }

            // action
            buffer.writeInt32LE(exp.action ?? 0, offset);
            offset += 4;

            // reward
            buffer.writeFloatLE(exp.reward ?? 0, offset);
            offset += 4;

            // nextState
            for (let j = 0; j < numStates; j++) {
                buffer.writeFloatLE(exp.nextState[j] ?? 0, offset);
                offset += 4;
            }

            // done (bool → uint8)
            buffer.writeUInt8(exp.done ? 1 : 0, offset);
            offset += 4; // padding
        }

        fs.writeFileSync(filePath, buffer);
        console.log(
            `[DDQN] Replay buffer saved (${validExps.length} experiences).`
        );
    }

    loadReplayBuffer() {
        const filePath = path.join(modelDir, "replay.bin");
        if (!fs.existsSync(filePath)) {
            console.warn("[DDQN] No replay buffer file found.");
            return;
        }

        const buffer = fs.readFileSync(filePath);
        const numStates = this.numStates;
        const recordSize = (numStates * 2 + 3) * 4;
        const numRecords = Math.floor(buffer.length / recordSize);

        this.replayBuffer = new ReplayBuffer(this.replayBuffer.size);
        let offset = 0;

        for (let i = 0; i < numRecords; i++) {
            const state = new Float32Array(numStates);
            for (let j = 0; j < numStates; j++) {
                state[j] = buffer.readFloatLE(offset);
                offset += 4;
            }

            const action = buffer.readInt32LE(offset);
            offset += 4;
            const reward = buffer.readFloatLE(offset);
            offset += 4;

            const nextState = new Float32Array(numStates);
            for (let j = 0; j < numStates; j++) {
                nextState[j] = buffer.readFloatLE(offset);
                offset += 4;
            }

            const done = !!buffer.readUInt8(offset);
            offset += 4;

            this.replayBuffer.add({ state, action, reward, nextState, done });
        }

        console.log(`[DDQN] Replay buffer loaded (${numRecords} experiences).`);
    }

    // resetNoise() {
    //     this.model.layers.forEach((layer) => {
    //         if (layer.resetNoise) {
    //             layer.resetNoise();
    //         }
    //     });
    // }
}


//Create global agent:
let agent = null;
const statesNum = parseInt(workerData.AGENT_STATES_NUM, 10);
const actionsNum = parseInt(workerData.AGENT_ACTIONS_NUM, 10);

(async () => {
    agent = new DQNModel(statesNum, actionsNum);
})();

// temp epsilon from start:
// agent.enableTemporaryEpsilon(0.2, 100000);



