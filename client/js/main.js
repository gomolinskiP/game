// const audioContext = Tone.getContext();
// console.log(audioContext);

// game:

import { Graphics } from "./graphics.js";

// import { Player, Bot, Bullet, Pickup, Tile } from "./classes.js";
import { Player } from "./object_classes/C_Character.js";
import { Bullet } from "./object_classes/C_Bullet.js";
import { Pickup } from "./object_classes/C_Pickup.js";
import { Tile } from "./object_classes/C_Tile.js";

import { Sounds, ClockSync } from "./sounds.js";
import { addKeyboardListeners, Keyboard } from "./keyboard.js";
// import { chatInit } from "./textChat.js";
import { GameUI } from "./gameButtons.js";
import { Socket } from "./clientSocket.js";
import { TextChat } from "./textChat.js";
import { GameMessages } from "./GameMessages.js";

const socket = Socket.clientSocket;



Tile.loadMapData();
// let gameLoaded = false;


//create synths beforehand and store them in a synth pool:
// SynthPool.populateAllPools(4)

socket.on("dbProgressChecked", (data)=>{
    Socket.setSelfID(data.selfID);
    console.log("db progress checked");
});

socket.on("init", function (data) {
    console.log("InitPack:", data)

    // Socket.setSelfID(data.selfId);
    Sounds.setScale(data.scale.name, data.scale.allowedNotes);
    Sounds.setupNoteKeyboard();
    Sounds.setBPM(data.bpm);

    GameUI.setActiveNote(data.selectedNote);
    GameUI.setSoundLabel(data.weapon.sound);
    GameUI.setDurationLabel(data.weapon.duration);
    GameUI.setWeaponType(data.weapon.type);
    GameUI.setTop3(data.top3);

    //create game objects from initPack:
    for (let i = 0; i < data.entities.length; i++) {
        const entity = data.entities[i];
        const id = entity.id;

        switch (entity.type) {
            case "player":
                new Player(id, entity);
                break;
            // case "bot":
            //     new Bot(id, entity);
            //     break;
            case "bullet":
                new Bullet(id, entity);
                break;
            case "pickup":
                new Pickup(id, entity);
                break;
            case "tile":
                new Tile(id, entity);
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
    GameMessages.init();
    // chatInit(socket, Graphics.canvas, isInChat);
});

socket.on("update", function (data) {
    //gets an array of objects to update and updates or creates them:
    // console.log("updatePack:", data)

    for(let id in data.player){
        let player = Player.list[id];
        const pack = data.player[id];
        if (player) {
            player.update(pack);
        } else {
            new Player(id, pack);
        }
    }

    for(let id in data.bullet){
        let b = Bullet.list[id];
        const pack = data.bullet[id];

        if (b) {
            b.update(pack);
        } else {
            new Bullet(id, pack);
            if (pack.parentId == Socket.selfId) {
                GameUI.highlightPlayedNote(pack.note, pack.duration);
            }
        }
    }

    for(let id in data.pickup){
        let p = Pickup.list[id];

        if (!p) {
            const pack = data.pickup[id];
            new Pickup(id, pack);
        }
    }

    for(let id in data.tile){
        let tile = Tile.list[id];

        if(!tile){
            const pack = data.tile[id];
            new Tile(id, pack);
        }
    }

    if(data.gameMsg){
        const pack = data.gameMsg;
        Graphics.addGameMsg(pack.msg, pack.rating);
    }

    if(data.death){
        const pack = data.death;
        GameUI.showDeathMessage(pack);
    }

    if(data.top3){
        GameUI.setTop3(data.top3);
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
                Player.list[id].destroy();
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

    // console.log("Ping:", latency, "ms | " , "Delay:", delay, "ms | ", "Offset:", offset, "ms.");
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


