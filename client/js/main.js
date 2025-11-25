// const audioContext = Tone.getContext();
// console.log(audioContext);

// game:

import { Graphics } from "./graphics.js";

import { Player, Bot, Bullet, Pickup, Tile } from "./classes.js";
import { Sounds, ClockSync } from "./sounds.js";
import { addKeyboardListeners, Keyboard } from "./keyboard.js";
// import { chatInit } from "./textChat.js";
import { GameUI } from "./gameButtons.js";
import { Socket } from "./clientSocket.js";
import { TextChat } from "./textChat.js"

const socket = Socket.clientSocket;



Tile.loadMapData();
let gameLoaded = false;


//create synths beforehand and store them in a synth pool:
// SynthPool.populateAllPools(4)

socket.on("init", function (data) {
    console.log("InitPack:", data)

    Socket.setSelfID(data.selfId);
    Sounds.setScale(data.scale.name, data.scale.allowedNotes);
    Sounds.setupNoteKeyboard();
    Sounds.setBPM(data.bpm);

    GameUI.setActiveNote(data.selectedNote);
    GameUI.setSoundLabel(data.weapon.sound);
    GameUI.setDurationLabel(data.weapon.duration);
    GameUI.setWeaponType(data.weapon.type);

    //create game objects from initPack:
    for (let i = 0; i < data.entities.length; i++) {
        let entity = data.entities[i];

        switch (entity.type) {
            case "player":
                new Player(entity);
                break;
            case "bot":
                new Bot(entity);
                break;
            case "bullet":
                new Bullet(entity);
                break;
            case "pickup":
                new Pickup(entity);
                break;
            case "tile":
                new Tile(entity);
                break;
            default:
                console.log(`Unknown entity type: ${entity.pickup}`);
        }
    }

    socket.emit("initialized");

    //start the game loop:
    requestAnimationFrame(Graphics.gameLoop);
    addKeyboardListeners(socket);
    TextChat.chatInit(socket);
    // chatInit(socket, Graphics.canvas, isInChat);
});

socket.on("update", function (data) {
    //gets an array of objects to update and updates or creates them:
    // console.log("updatePack:", data)

    for (let i = 0; i < data.length; i++) {
        let pack = data[i];
        let id = pack.id;

        switch (pack.type) {
            case "player":
                let p = Player.list[id];
                if (p) {
                    p.update(pack);
                } else {
                    new Player(pack);
                }
                break;
            case "bot":
                const bt = Player.list[id];
                if(bt){
                    bt.update(pack);
                }
                else{
                    new Bot(pack);
                }
                break;
            case "bullet":
                let b = Bullet.list[id];
                if (b) {
                    b.update(pack);
                } else {
                    new Bullet(pack);
                    if (pack.parentId == Socket.selfId) {
                        GameUI.highlightPlayedNote(pack.note, pack.duration);
                    }
                }
                break;
            case "pickup":
                let pU = Pickup.list[id];
                if (!pU) {
                    new Pickup(pack);
                }
                break;
            case "tile":
                let tile = Tile.list[id];
                if (!tile) {
                    new Tile(pack);
                }
                break;
            case "weapon":
                console.log(pack);
                if (pack.weaponType) GameUI.setWeaponType(pack.weaponType);
                if (pack.duration){
                    GameUI.setDurationLabel(pack.duration);
                    // timingHelperID = newTimingHelper(pack.duration, timingHelperID);
                }
                if (pack.sound) GameUI.setSoundLabel(pack.sound);
                break;
            case "gameMsg":
                Graphics.addGameMsg(pack.msg, pack.rating);
                break;
            case "death":
                console.log('death', pack);
                GameUI.showDeathMessage(pack);
                break;
        }
    }
});

socket.on("remove", function (data) {
    // console.log("removePack:", data)

    for (let i = 0; i < data.length; i++) {
        let entity = data[i];
        let id = entity.id;

        switch (entity.type) {
            case "player":
            case "bot":
                if (!Player.list[id]) {
                    console.log(`ERROR NO PLAYER WITH ID=${id}`);
                    continue;
                }
                delete Player.list[id];
                // console.log(`removing player`)
                break;
            case "bullet":
                if (!Bullet.list[id]) {
                    console.log(`ERROR NO BULLET WITH ID=${id}`);
                    continue;
                }
                Bullet.list[id].destroy();
                // console.log(`removing bullet`)

                break;
            case "pickup":
                if (!Pickup.list[id]) {
                    console.log(`ERROR NO PICKUP WITH ID=${id}`);
                    continue;
                }
                Pickup.list[id].destroy();
                // console.log(`removing pickup`)
                break;
            case "tile":
                if (!Tile.list[id]) {
                    console.log(`ERROR NO TILE WITH ID=${id}`);
                    continue;
                }
                Tile.list[id].destroy();
                // console.log(`removing tile`)
                break;
        }
    }
});

Graphics.canvas.onblur = () => {
    // alert("x")
};

socket.on("redirect", (destination) => {
    window.location.href = destination;
});

socket.on("respawned", ()=>{
    GameUI.hideDeathMessage();
})

socket.on("bpmChange", (newBPM)=>{
    Sounds.setBPM(newBPM);
})


//delay  : (t1 - t0) + (t3 - t2)
//offset : (t1 - t3 + t2 - t0) / 2
//rtt    : t3 - t0


//PING:
function measurePing() {
    const t0 = Date.now();
    socket.emit("pingCheck", t0);
}

socket.on("pongCheck", (data) => {
    const t3 = Date.now();

    const t0 = data.t0;
    const t1 = data.t1;
    const t2 = data.t2;
    

    const latency = t3 - t0;
    const delay = (t1 - t0) + (t3 - t2);
    const offset = (t1 - t3 + t2 - t0) / 2;

    console.log("Ping:", latency, "ms | " , "Delay:", delay, "ms | ", "Offset:", offset, "ms.");
    ClockSync.addToBuffer(offset, delay);
    ClockSync.rtt = latency;
    ClockSync.delay = delay;
});

setInterval(measurePing, 5000);

socket.on("scaleChange", (newScale) => {
    Sounds.setScale(newScale.name, newScale.allowedNotes);
});







// let timingHelperID = Tone.Transport.scheduleRepeat((time) => {
//     GameUI.highlightTimingHelper();
// }, "1n");
//TODO not always in sync with server timing validation!!!
// function newTimingHelper(newDuration, timingHelperID){
//     Tone.Transport.clear(timingHelperID);
//     const nextBarTime = Tone.Transport.nextSubdivision("1n");
//     console.log(nextBarTime)

//     const newTimingHelperID = Tone.Transport.scheduleRepeat(
//         (time) => {
//             GameUI.highlightTimingHelper();
//         },
//         newDuration,
//         0
//     );
//     return newTimingHelperID;
// }

socket.on("tick", Sounds.handleMetronomeTick);


