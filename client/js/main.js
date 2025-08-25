let isInChat = false;
export function setIsInChat(state){
    isInChat = state;
}
export function getIsInChat(){
    return isInChat;
}

const audioContext = Tone.getContext();
console.log(audioContext)



// game:

import { gameLoop, canvas } from './graphics.js'

import { Player, Bullet, Pickup, Tile } from './classes.js'
import { addKeyboardListeners } from './keyboard.js';
import { chatInit } from './textChat.js';
import { GameUI } from './gameButtons.js'
import { Sounds } from './sounds.js';
import { Socket } from './clientSocket.js';

const socket = Socket.clientSocket;

export const limiter = new Tone.Compressor(
    -0.1,
    20
)
// const reverb = new Tone.Reverb();
// const delay = new Tone.FeedbackDelay("1n", 0.2);

limiter.toDestination();

//create synths beforehand and store them in a synth pool:
// SynthPool.populateAllPools(4)


socket.on('init', function(data){
    // console.log("InitPack:", data)

    Socket.setSelfID(data.selfId);

    Sounds.setScale(data.scale.name, data.scale.allowedNotes)
    Sounds.setBPM(data.bpm);

    GameUI.setActiveNote(data.selectedNote);
    GameUI.setSoundLabel(data.weapon.sound);
    GameUI.setDurationLabel(data.weapon.duration);
    GameUI.setWeaponType(data.weapon.type);

    //create game objects from initPack:
    for(let i = 0; i<data.entities.length; i++){
        let entity = data.entities[i];

        switch(entity.type){
            case "player":
                new Player(entity);
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
                console.log(`Unknown entity type: ${entity.pickup}`)
        }
    }

    //start the game loop:
    requestAnimationFrame(gameLoop);
    addKeyboardListeners(socket);
    chatInit(socket, canvas, isInChat);
})

socket.on('update', function(data){
    //gets an array of objects to update and updates or creates them:
    // console.log("updatePack:", data)

    for(let i = 0; i<data.length; i++){
        let pack = data[i];
        let id = pack.id;

        switch(pack.type){
            case "player":
                let p = Player.list[id];
                if(p){
                    p.update(pack);
                }
                else{
                    new Player(pack);
                }
                break;
            case "bullet":
                let b = Bullet.list[id]
                if(b){
                    b.update(pack);
                }
                else{
                    new Bullet(pack);
                    if(pack.parentId == Socket.selfId){
                        GameUI.highlightPlayedNote(pack.note, pack.duration)
                    }
                }
                break;
            case "pickup":
                let pU = Pickup.list[id]
                if(!pU){
                    new Pickup(pack)
                }
                break;
            case "tile":
                let tile = Tile.list[id];
                if(!tile){
                    new Tile(pack);
                }
                break;
            case "weapon":
                console.log(pack)
                if(pack.weaponType) GameUI.setWeaponType(pack.weaponType);
                if(pack.duration) GameUI.setDurationLabel(pack.duration);
                if(pack.sound) GameUI.setSoundLabel(pack.sound);
                break;
        }
    }
})

socket.on('remove', function(data){
    // console.log("removePack:", data)

    for(let i = 0; i<data.length; i++){
        let entity = data[i]
        let id = entity.id;

        switch(entity.type){
            case "player":
                if(!Player.list[id]){
                    console.log(`ERROR NO PLAYER WITH ID=${id}`);
                    continue;
                }
                delete Player.list[id];
                // console.log(`removing player`)
                break;
            case "bullet":
                if(!Bullet.list[id]){
                    console.log(`ERROR NO BULLET WITH ID=${id}`);
                    continue;
                }
                Bullet.list[id].destroy();
                // console.log(`removing bullet`)

                break;
            case "pickup":
                if(!Pickup.list[id]){
                    console.log(`ERROR NO PICKUP WITH ID=${id}`);
                    continue;
                }
                Pickup.list[id].destroy();
                // console.log(`removing pickup`)
                break;
            case "tile":
                if(!Tile.list[id]){
                    console.log(`ERROR NO TILE WITH ID=${id}`);
                    continue;
                }
                Tile.list[id].destroy();
                // console.log(`removing tile`)
                break;
        }
    }
})



canvas.onblur = ()=>{
    // alert("x")
}

socket.on('redirect', (destination)=>{
    window.location.href = destination;
})

let notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

let timeSig = 4;
Tone.Transport.bpm.value = 120;
Tone.Transport.timeSignature = timeSig;
let beatCounter = 0;

const metronome = new Tone.Synth();
let metrVol = new Tone.Volume(-26);
metronome.chain(metrVol, Tone.Destination);

// socket.on("tick", (data)=>{
//     if(!Sounds.scaleBase) return;
//     let clientNow = Date.now()
//     // console.log(data.now, data.tick, data.now - clientNow)

//     if(Tone.Transport.state != 'started') Tone.Transport.start();
//     else{
//         let pitch;
//         let color;
//         if(data.tick%8 == 0){
//             pitch = `${Sounds.scaleBase}6`
//             color = 'green';
//         }
//         else{
//             pitch = `${Sounds.scaleBase}5`
//             color = 'red';
//         }
        
//         console.log(Tone.Transport.seconds)
//         console.log(Tone.Transport.position)
//         GameUI.highlightMetronome(color);
//         if(Tone.context.state !== "running" || !Sounds.audioOn) return;
//         Tone.Transport.scheduleOnce((time)=>{
//             metronome.triggerAttackRelease(pitch, "32n", time)
//         }, Tone.Transport.toSeconds())
//     }
// })

let beatInterval = 60000/120;
let firstTickT;
let firstTickNum;

Tone.Transport.scheduleRepeat((time)=>{
    const [bar, beat, subbeat] = Tone.Transport.position.split(":").map(Number);
    let octave;
    let metronomeHighlight;
    if(beat%4 == 0){
        octave = 6;
        metronomeHighlight = 'green';
    }
    else{
        octave = 5;
        metronomeHighlight = 'red';
    }

    GameUI.highlightMetronome(metronomeHighlight);

    const note = `${Sounds.scaleBase}${octave}`

    // console.log(`metronome: ${Tone.Transport.position}`)
    metronome.triggerAttackRelease(note, "32n", time)
}, "4n")

socket.on('tick2', (data)=>{
    //cannot start transport until audio context is running:
    if(Tone.context.state !== "running") return;

    const tickNum = data.tick;
    const clientTime = Date.now();
    const serverTime = data.serverTime;

    const timeDelay = clientTime - serverTime;

    if(!firstTickT){
        if(!tickNum%4) return; //want to start on first beat
        firstTickT = clientTime - timeDelay;
        firstTickNum = tickNum;

        console.log(`starting transport`)
        Tone.Transport.start("+0", `${timeDelay/1000}`);
    }
    else{
        const deltaT = clientTime - firstTickT;
        const localTickNum = tickNum - firstTickNum;

        const desiredDeltaT = localTickNum * beatInterval;
        const err = deltaT - desiredDeltaT;

        fixTransport(desiredDeltaT)

        // console.log(`tickN: ${localTickNum} | tickDelay ${timeDelay} | deltaT: ${deltaT} | desiredDeltaT: ${desiredDeltaT} | err ${err}`);
        // console.log(Tone.Transport.seconds, Tone.Transport.position, `${Math.round(Tone.Transport.seconds*1000 - desiredDeltaT)}`)
        
    }
})

function fixTransport(miliseconds){
    //TODO compare positions (not seconds) & make bpm faster or slower
    const baseBPM = 120;

    const desiredSeconds = miliseconds/1000;
    const desiredPosition = secondsToPosition(desiredSeconds);

    const tPosition = Tone.Transport.position;

    const error = positionToSeconds(desiredPosition) - positionToSeconds(tPosition)

    // console.log(`desiredPos: ${desiredPosition}, tPos: ${tPosition} ${Tone.Transport.position} | errT:${error}`)

    if(Math.abs(error)<0.1){
        Tone.Transport.bpm.value = baseBPM;
        return;
    }

    const correction = Math.max(0.5, Math.min(2, 1+error));
    
    Tone.Transport.bpm.value = baseBPM * correction;
    // console.log(`bpm correction: ${Tone.Transport.bpm.value}`)

    

    // const baseBPM = 120;
    // const seconds = miliseconds/1000;
    // const tPosition = Tone.Transport.position;
    // const desiredPosition = secondsToPosition(seconds);
    // console.log(tPosition, desiredPosition)

    // if(tPosition>desiredPosition){
    //     //Tone transport is too early!

    //     Tone.Transport.bpm.value = Tone.Transport.bpm.value * 0.99;
    // }

    // if(tPosition<desiredPosition){
    //     //Tone transport is late
    //     Tone.Transport.bpm.value = Tone.Transport.bpm.value * 1.01;
    // }
    // console.log(`bpm changer: ${Tone.Transport.bpm.value}`)

//     const error = seconds - Tone.Transport.seconds
//     console.log(`fixTransport transportError: ${error}`)

//     if(Math.abs(error)<0.1){
//         Tone.Transport.bpm.value = baseBPM;
//         return;
//     }

//     Tone.Transport.bpm.value = baseBPM * error;
//     console.log(`bpm correction: ${Tone.Transport.bpm.value}`)
}

function positionToSeconds(position){
    const beatsPerBar = 4;
    const bpm = 120;
    const [bars, beats, sixteenths] = position.split(":").map(Number);
    const beatSec = 60 / bpm;
    const totalBeats = bars * beatsPerBar + beats + sixteenths / 4;
    return totalBeats * beatSec;
}

function secondsToPosition(seconds){
    const beatSec = 60 / 120;
    const totalBeats = seconds / beatSec;

    const beatsPerBar = 4; // np. 4/4
    const bars = Math.floor(totalBeats / beatsPerBar);
    const beatInBar = Math.floor(totalBeats % beatsPerBar);

    const sixteenthSec = beatSec / 4; // 1 beat = 4 szesnastki
    const sixteenths = ((seconds % beatSec) / sixteenthSec).toFixed(3);

    const position = `${bars}:${beatInBar}:${sixteenths}`;
    return position;
}
