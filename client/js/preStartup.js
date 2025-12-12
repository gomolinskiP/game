import { Socket } from "./clientSocket.js";
import { Images } from "./Assets.js";

/*
Pre-startup script should:
- fetch all required images from server (universal & tiles),
- fetch all required audio files from server,
- get selfId info from server WS,
- get data required for game UI: players HP, score, weapon info, server scale & bpm
- after above is done, allow to start the proper game
*/


//start game button, all preload content & game content:
const startGameBTN = document.getElementById("start-game-btn");
const preloadContent = document.getElementById("not-loaded");
const gameContent = document.getElementById("loaded");

//loading information elements:
const progressInfoAll = document.getElementById("progress-all");
const progressInfoConnect = document.getElementById("progress-info-connect");
const progressInfoDB = document.getElementById("progress-info-db");
const progressInfoImages = document.getElementById("progress-info-images");
let isConnected,
    isProgressLoaded,
    areImagesLoaded = false;
startGameBTN.disabled = true;

//animating dots while loading:
const animatedDots = document.getElementById("dots-anim");
let dotsNum = 1;
const dotsNumChangeInterval = setInterval(() => {
    animatedDots.innerText = ".".repeat(dotsNum);

    dotsNum++;
    if (dotsNum > 5) dotsNum = 1;
}, 100);

//establish websocket connection:
const socket = Socket.clientSocket;
//notify of successful websocket connection:
socket.on("connect", () => {
    //notify user:
    progressInfoConnect.innerText = "Connected to server!";
    isConnected = true;
    //check if all loaded now:
    enableStartIfAllLoaded();
});
//notify of succesfull database progress load (server-side):
socket.on("dbProgressChecked", (data) => {
    //set player's self ID:
    Socket.setSelfID(data.selfID);
    //notify user:
    progressInfoDB.innerText = "Player progress loaded!";
    isProgressLoaded = true;
    //check if all loaded now:
    enableStartIfAllLoaded();
});

//load all image assets asynchronously:
await Images.loadImages();
//notify of all images load:
progressInfoImages.innerText = "Graphical assets loaded!";
areImagesLoaded = true;
//check if all loaded now:
enableStartIfAllLoaded();

//function checking if all start conditions are met:
function enableStartIfAllLoaded(){
    if(isConnected && isProgressLoaded && areImagesLoaded){
        //enable start button:
        startGameBTN.disabled = false;

        //stop dots animation & notify that loading finished:
        clearInterval(dotsNumChangeInterval);
        animatedDots.innerText = "";
        progressInfoAll.innerHTML = "Everything is ready!";
    }
}

//start the game on start button click:
startGameBTN.onclick = async () => {    
    //get audio context user permission:
    Tone.start();
    //load main game script:
    await import("./main.js");
    //notify server socket about starting the game:
    socket.emit("startGame");
    //hide preload HTML and show the game:
    preloadContent.style.display = "none";
    gameContent.style.display = "block";
};


