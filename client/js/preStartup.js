import { Graphics } from "./graphics.js";
console.log('start loading images:')
await Graphics.loadImages();
console.log('images loaded!')

/*
Pre-startup script should:
- fetch all required images from server (universal & tiles),
- fetch all required audio files from server,
- get selfId info from server WS,
- get data required for game UI: players HP, score, weapon info, server scale & bpm
- after above is done, allow to start the proper game
*/

const startGameBTN = document.getElementById("start-game-btn");
const preloadContent = document.getElementById("not-loaded");
const gameContent = document.getElementById("loaded");

startGameBTN.onclick = () => {
    //game is loaded - start:
    preloadContent.style.display = "none";
    gameContent.style.display = "block";

    clearInterval(dotsNumChangeInterval);

    Tone.start();
};

const animatedDots = document.getElementById("dots-anim");

let dotsNum = 1;
const dotsNumChangeInterval = setInterval(() => {
    animatedDots.innerText = ".".repeat(dotsNum);

    dotsNum++;
    if (dotsNum > 5) dotsNum = 1;
}, 200);
