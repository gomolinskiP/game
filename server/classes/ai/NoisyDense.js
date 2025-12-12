import * as tf from "@tensorflow/tfjs-node";

export class NoisyDense extends tf.layers.Layer {
    static className = "NoisyDense";

    constructor(config) {
        super(config);
        this.units = config.units;

        if (config.activation) {
            this.activation = tf.leakyRelu;
        } else {
            this.activation = (x) => x; //linear
        }

        this.sigmaInit = config.sigmaInit ?? 0.017;
        this.useBias = config.useBias ?? true;

        this.epsilonW = null;
        this.epsilonB = null;

        this.factorized = config.factorized ?? true;
    }

    f(x) {
        // f(x) = sign(x) * sqrt(|x|)
        return tf.sign(x).mul(tf.sqrt(tf.abs(x)));
    }

    resetNoise() {
        // console.log("RESET NOISE:", this.inputDim, this.units);

        if (!this.inputDim || !this.units) {
            console.warn(
                "NoisyDense.resetNoise() — brak wymiarów:",
                this.inputDim,
                this.units
            );
            return;
        }

        // Usuń stare (żeby nie ciekła pamięć GPU/CPU)
        if (this.epsilonW) this.epsilonW.dispose();
        if (this.epsilonB) this.epsilonB.dispose();

        const { epsilonW, epsilonB } = tf.tidy(() => {
            const epsIn = this.f(tf.randomNormal([this.inputDim]));
            const epsOut = this.f(tf.randomNormal([this.units]));

            const epsilonW = tf.outerProduct(epsIn, epsOut);

            let epsilonB = null;
            if (this.useBias) {
                epsilonB = this.f(tf.randomNormal([this.units]));
            }

            return { epsilonW, epsilonB };
        });

        this.epsilonW = epsilonW;
        if (this.useBias) this.epsilonB = epsilonB;
    }

    sampleNoise(shape) {
        return tf.randomNormal(shape);
    }

    build(inputShape) {
        const inputDim = inputShape[inputShape.length - 1];
        this.inputDim = inputDim;

        this.muWeight = this.addWeight(
            "muWeight",
            [inputDim, this.units],
            "float32",
            tf.initializers.randomUniform({
                minval: -1 / Math.sqrt(inputDim),
                maxval: 1 / Math.sqrt(inputDim),
            })
        );
        this.sigmaWeight = this.addWeight(
            "sigmaWeight",
            [inputDim, this.units],
            "float32",
            tf.initializers.constant({ value: this.sigmaInit })
        );

        if (this.useBias) {
            this.muBias = this.addWeight(
                "muBias",
                [this.units],
                "float32",
                tf.initializers.randomUniform({
                    minval: -1 / Math.sqrt(inputDim),
                    maxval: 1 / Math.sqrt(inputDim),
                })
            );
            this.sigmaBias = this.addWeight(
                "sigmaBias",
                [this.units],
                "float32",
                tf.initializers.constant({ value: this.sigmaInit })
            );
        }

        this.built = true;
    }

    call(inputs) {
        return tf.tidy(()=>{
            const input = Array.isArray(inputs) ? inputs[0] : inputs;

            if (!(this.epsilonW instanceof tf.Tensor)) {
                console.error("epsilonW is not Tensor", this.epsilonW);
            }

            if (!this.epsilonW) {
                console.warn(
                    "NoisyDense.call() - brak epsilonW, wymuszam resetNoise()"
                );
                this.resetNoise();
            }

            const noisyWeight = tf.add(
                this.muWeight.read(),
                this.sigmaWeight.read().mul(this.epsilonW)
            );

            let output = tf.matMul(input, noisyWeight);

            noisyWeight.dispose();

            if (this.useBias) {
                if (!this.epsilonB) {
                    console.warn(
                        "NoisyDense.call() - brak epsilonB, wymuszam resetNoise()"
                    );
                    this.resetNoise();
                }

                const noisyBias = tf.add(
                    this.muBias.read(),
                    this.sigmaBias.read().mul(this.epsilonB)
                );

                output = tf.add(output, noisyBias);
                noisyBias.dispose();
            }

            if (this.activation != null) {
                output = this.activation(output);
            }

            return output;
        });
    }

    computeOutputShape(inputShape) {
        const outputShape = inputShape.slice();
        outputShape[outputShape.length - 1] = this.units;
        return outputShape;
    }

    getConfig() {
        return {
            ...super.getConfig(),
            units: this.units,
            activation: this.activation.name,
            sigmaInit: this.sigmaInit,
            useBias: this.useBias,
        };
    }
}

// register to allow serialization:
tf.serialization.registerClass(NoisyDense);
