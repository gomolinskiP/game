import * as tf from "@tensorflow/tfjs";
// import "@tensorflow/tfjs-node";

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

export class DQNAgent{
    constructor(numStates, numActions, {
        gamma = 0.95,
        epsilonStart = 1.0,
        epsilonEnd = 0.1,
        epsilonDecaySteps = 1e4,
        learningRate = 0.00025,
        batchSize = 32,
        bufferSize = 50000,
        targetUpdateFreq = 1000,
        hiddenLayers = [160, 80],
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

        this.stepCounter = 0;
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

        this.epsilon = Math.max(
            this.epsilonEnd,
            this.epsilonStart - (this.stepCounter/this.epsilonDecaySteps) * (this.epsilonStart - this.epsilonEnd)
        );

        if(Math.random() < this.epsilon){
            return Math.floor(Math.random() * this.numActions);
        }
        else{
            return tf.tidy(()=>{
                const stateTensor = tf.tensor2d([state], [1, this.numStates]);
                const qValues = this.model.predict(stateTensor);
                return qValues.argMax(-1).dataSync()[0];
            });
        }
    }

    remember(state, action, reward, nextState){
        this.replayBuffer.add({state, action, reward, nextState});
    }

    async replay(){
        if(this.replayBuffer.length < this.batchSize) return;

        const batch = this.replayBuffer.sample(this.batchSize);

        const states = batch.map(e => e.state);
        if (!states.every((s) => s.every((v) => isFinite(v)))) {
            console.log(states);
            throw new Error("Non-finite state detected");
        }
        const nextStates = batch.map(e => e.nextState);

        const statesTensor = tf.tensor2d(states, [batch.length, this.numStates]);
        const nextStatesTensor = tf.tensor2d(nextStates, [batch.length, this.numStates]);

        const qValues = this.model.predict(statesTensor);
        const qValuesNextTarget = this.targetModel.predict(nextStatesTensor);

        const qValuesArray = qValues.arraySync();
        const qValuesNextArray = qValuesNextTarget.arraySync();

        for(let i = 0; i < batch.length; i++){
            const {action, reward} = batch[i];

            const maxNextQ = Math.max(...qValuesNextArray[i]);
            if (!isFinite(maxNextQ)) {
        console.error("maxNextQ is not finite:", qValuesNextArray[i]);
        continue;
    }

            const target = reward + (this.gamma * Math.max(...qValuesNextArray[i]));

            if (isFinite(target)) {
                qValuesArray[i][action] = target;
            } else {
                console.error("Target NaN at", i, { reward, done, maxNextQ });
            }
        }

        const updatedTensor = tf.tensor2d(qValuesArray, [batch.length, this.numActions]);

        // console.log("States sample:", states[0]);
        // console.log("Q before update:", qValuesArray[0]);
        // console.log("Q target:", updatedTensor.toString());
        const history = await this.model.fit(statesTensor, updatedTensor, {epochs: 1, verbose: 0});
        const loss = history.history.loss[0];


        console.log(`Loss: `, loss)

        tf.dispose([statesTensor, nextStatesTensor, qValues, qValuesNextTarget, updatedTensor]);

        if(this.stepCounter % this.targetUpdateFreq === 0){
            this.updateTargetNetwork();
        }
    }
}

