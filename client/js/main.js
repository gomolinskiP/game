let isInChat = false;
export function setIsInChat(state){
    isInChat = state;
}
export function getIsInChat(){
    return isInChat;
}


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
const reverb = new Tone.Reverb();
const delay = new Tone.FeedbackDelay("1n", 0.2);

limiter.toDestination();




socket.on('init', function(data){
    console.log("InitPack:", data)

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
Tone.Transport.start();
const metronome = new Tone.Synth();
let metrVol = new Tone.Volume(-26);
metronome.chain(metrVol, Tone.Master);

socket.on("tick", (data)=>{
    if(!Sounds.scaleBase) return;
    let clientNow = Date.now()

    if(Tone.Transport.state != 'started') Tone.Transport.start();
    else{
        let pitch;
        let color;
        if(data.tick%8 == 0){
            pitch = `${Sounds.scaleBase}6`
            color = 'green';
        }
        else{
            pitch = `${Sounds.scaleBase}5`
            color = 'red';
        }
        
        GameUI.highlightMetronome(color);
        if(Tone.context.state !== "running" || !Sounds.audioOn) return;
        Tone.Transport.scheduleOnce((time)=>{
            metronome.triggerAttackRelease(pitch, "32n", time)
        }, Tone.Transport.toSeconds())
    }
    // console.log(data.now, data.tick, data.now - clientNow)
})
