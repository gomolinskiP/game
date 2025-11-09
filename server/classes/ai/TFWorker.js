import * as tf from "@tensorflow/tfjs-node";
import { parentPort, workerData } from "worker_threads";

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const fs = require('fs');

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
    }
}

const lossLogger = new AvgLogger("logs/loss.txt");

const minQLogger = new AvgLogger("logs/minQ.txt");
const maxQLogger = new AvgLogger("logs/maxQ.txt");
const meanQLogger = new AvgLogger("logs/meanQ.txt");

const maxTDLogger = new AvgLogger("logs/maxTD.txt");
const meanTDLogger = new AvgLogger("logs/meanTD.txt");

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

class PrioritizedReplayBuffer{
    constructor(capacity, priorityAlpha = 0.6, betaStart = 0.4, betaFrames = 100000){
        this.capacity = capacity;
        this.buffer = [];
        this.priorities = [];
        this.position = 0;
        this.priorityAlpha = priorityAlpha;
        this.betaStart = betaStart;
        this.betaFrames = betaFrames;
        this.frame = 1;
    }

    add(experience){
        const maxPrio = this.priorities.length > 0
            ? Math.max(...this.priorities)
            : 1.0;
        // console.log(maxPrio);


        if(this.buffer.length < this.capacity){
            this.buffer.push(experience);
            this.priorities.push(maxPrio);
        } else{
            this.buffer[this.position] = experience;
            this.priorities[this.position] = maxPrio;
        }

        this.position = (this.position + 1) % this.capacity;
    }

    sample(batchSize){
        //getting propabilities from priorities:
        const prios = this.priorities.map(p => Math.pow(p, this.priorityAlpha));
        const sumP = prios.reduce((a, b) => a+b, 0);
        const probs = prios.map(p => p/sumP);

        //getting random experiences by propabilities:
        const indices = [];
        for(let i=0; i<batchSize; i++){
            const rand = Math.random();
            let cumSum = 0;
            for(let j=0; j<probs.length; j++){
                cumSum += probs[j];
                if(rand <= cumSum){
                    indices.push(j);
                    break;
                }
            }
        }

        //increase beta with each batch:
        const beta = Math.min(
            1.0,
            this.betaStart + this.frame * (1.0 - this.betaStart) / this.betaFrames
        );
        this.frame++;

        //weight correction:
        const weights = indices.map(i => Math.pow(this.buffer.length * probs[i], -beta));
        const maxW = Math.max(...weights);
        const normWeights = weights.map(w => w/maxW);

        const samples = indices.map(i => this.buffer[i]);

        return {samples, indices, weights: normWeights};
    }

    updatePriorities(indices, tdErrors){
        const absErrors = tdErrors.map(e => Math.abs(e) + 1e-5);
        // const maxErr = Math.max(...absErrors);

        for(let i=0; i<indices.length; i++){
            const idx = indices[i];
            const scaled = Math.log1p(absErrors[i]); 
            this.priorities[idx] = Math.max(
                scaled,
                0.05
            );
        }

        if(this.frame % 1000 == 0){
            fs.writeFileSync(
                "logs/priorities.txt",
                "mean priority " +
                (this.priorities.reduce((a, b) => a + b) / this.priorities.length) +
                " maxP " + 
                Math.max(...this.priorities) +
                " minP " +
                Math.min(...this.priorities) + "\n",
                {
                    encoding: "utf8",
                    flag: "a+",
                    mode: 0o666,
                }
            );
        }

        // console.log(
            // "mean priority",
            // this.priorities.reduce((a, b) => a + b) / this.priorities.length,
            // 'maxP',
            // Math.max(...this.priorities),
            // 'minP',
            // Math.min(...this.priorities)
        // );
    }

    get length(){
        return this.buffer.length;
    }
}

export class DQNAgent{
    constructor(numStates, numActions, {
        gamma = 0.99,
        epsilonStart = 1.0,
        epsilonEnd = 0.01,
        epsilonDecaySteps = 4e6,
        learningRate = 0.0001,
        batchSize = 128,
        bufferSize = 400000,
        targetUpdateFreq = 2500,
        experienceReplayFreq = 10,
        hiddenLayers = [512, 256, 128],
    } = {}){
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

        this.model = this._createModel(hiddenLayers);
        this.targetModel = this._createModel(hiddenLayers);
        this.updateTargetNetwork();
    }

    _createModel(hiddenLayers){
        const model = tf.sequential();
        hiddenLayers.forEach((units, i) => {
            model.add(tf.layers.dense({
                units,
                activation: 'relu',
                inputShape: i === 0 ? [this.numStates] : undefined,
            }));
        });
        model.add(tf.layers.dense({units: this.numActions}));
        model.compile({
            optimizer: tf.train.adam(this.learningRate),
            loss: 'meanSquaredError'
        });
        return model;
    }

    updateTargetNetwork(){
        this.targetModel.setWeights(this.model.getWeights());
    }

    decide(state){
        this.stepCounter++;

        let action;

        this.epsilon = Math.max(
            this.epsilonEnd,
            this.epsilonStart - (this.stepCounter/this.epsilonDecaySteps) * (this.epsilonStart - this.epsilonEnd)
        );

        if(Math.random() < this.epsilon){
            action = Math.floor(Math.random() * this.numActions);
        }
        else{
            action = tf.tidy(()=>{
                const stateTensor = tf.tensor2d([state], [1, this.numStates]);
                const qValues = this.model.predict(stateTensor);
                return qValues.argMax(-1).dataSync()[0];
            });
        }

        return action;
    }

    async remember(state, action, reward, nextState, done){
        this.replayBuffer.add({state, action, reward, nextState, done});

        this.rememberCounter++;
        if(this.rememberCounter % this.experienceReplayFreq === 0
            && this.rememberCounter >= 2000
        ){
            await this.replay();
        }
    }

    async replay(){
        if(this.replayBuffer.length < this.batchSize) return;

        // const {samples, indices, weights} = this.replayBuffer.sample(this.batchSize);
        const batch = this.replayBuffer.sample(this.batchSize);

        const states = batch.map(e => e.state);
        const nextStates = batch.map((e) => e.nextState);
        
        if (!states.every((s) => s.every((v) => isFinite(v)))) {
            console.log(states);
            throw new Error("Non-finite state detected");
        }

        const statesTensor = tf.tensor2d(states, [batch.length, this.numStates]);
        const nextStatesTensor = tf.tensor2d(nextStates, [batch.length, this.numStates]);

        // await tf.nextFrame();
        const qValues = this.model.predict(statesTensor);
        const qValuesNextMain = this.model.predict(nextStatesTensor);
        const qValuesNextTarget = this.targetModel.predict(nextStatesTensor);

        const qValuesArray = qValues.arraySync();
        const qValuesNextMainArray = qValuesNextMain.arraySync();
        const qValuesNextTargetArray = qValuesNextTarget.arraySync();

        //for Q-val logging:
        const qArr = qValues.arraySync();
        const maxQs = qArr.map((q) => Math.max(...q));
        const meanQ = maxQs.reduce((a, b) => a + b, 0) / maxQs.length;
        const minQ = Math.min(...maxQs);
        const maxQ = Math.max(...maxQs);

        meanQLogger.push(meanQ);
        minQLogger.push(minQ);
        maxQLogger.push(maxQ);

        const tdErrors = [];

        for(let i = 0; i < batch.length; i++){
            const {action, reward, done} = batch[i];

            const bestAction = qValuesNextMainArray[i].indexOf(
                        Math.max(...qValuesNextMainArray[i])
                    );
            const targetQValue = qValuesNextTargetArray[i][bestAction];

    //         const maxNextQ = Math.max(...qValuesNextArray[i]);
    //         if (!isFinite(maxNextQ)) {
    //     console.error("maxNextQ is not finite:", qValuesNextArray[i]);
    //     continue;
    // }

            const target = done
                ? reward 
                : reward + (this.gamma * targetQValue);

            const tdError = target - qValuesArray[i][action];
            tdErrors.push(tdError);

            if (isFinite(target)) {
                qValuesArray[i][action] = target;
            } else {
                console.error("Target NaN at", i, { reward, done, targetQValue });
            }

            // // console.log('tdErrors', tdErrors);
            // this.replayBuffer.updatePriorities(indices, tdErrors);
            // console.log(
            //     "\nqMain",
            //     qValuesNextMainArray[i],
            //     "\nbestAction",
            //     bestAction,
            //     "\ntargetQVal",
            //     qValuesNextTargetArray[i][bestAction],
            //     "\ntargetClassic",
            //     reward + this.gamma * Math.max(...qValuesNextTargetArray[i]),
            //     "\ntargetDDQN",
            //     target,
            //     "\ndone", done
            // );
        }

        //for tdErrors logging:
        const absTD = tdErrors.map((x) => Math.abs(x));
        const meanTD = absTD.reduce((a, b) => a + b, 0) / absTD.length;
        const maxTD = Math.max(...absTD);

        meanTDLogger.push(meanTD);
        maxTDLogger.push(maxTD);

        const updatedTensor = tf.tensor2d(qValuesArray, [batch.length, this.numActions]);

        if(!this.isTraining){
            this.isTraining = true;

            // const weightsTensor = tf.tensor1d(weights);
            const history = await this.model.fit(
                statesTensor,
                updatedTensor,
                {
                    // sampleWeight: weightsTensor,
                    epochs: 1,
                    verbose: 0
                });
            this.isTraining = false;
            const loss = history.history.loss[0];
            // weightsTensor.dispose();

            // console.log(`Loss: `, loss, ' | Epsilon: ', this.epsilon);
            // fs.writeFileSync(
            //     "logs/loss.txt",
            //     loss + "\n",
            //     {
            //         encoding: "utf8",
            //         flag: "a+",
            //         mode: 0o666,
            //     }
            // );
            lossLogger.push(loss);
        }

        

        tf.dispose([
            statesTensor,
            nextStatesTensor,
            qValues,
            qValuesNextMain,
            qValuesNextTarget,
            updatedTensor,
        ]);

        if(this.stepCounter % this.targetUpdateFreq === 0){
            this.updateTargetNetwork();
        }
    }
}

let agent = null;
const statesNum = parseInt(workerData.AGENT_STATES_NUM, 10);
const actionsNum = parseInt(workerData.AGENT_ACTIONS_NUM, 10);

(async () => {
    agent = new DQNAgent(statesNum, actionsNum);
})();

