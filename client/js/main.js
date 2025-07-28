var socket = io();

// game:

import { gameLoop, canvas } from './graphics.js'

import { Player, Bullet, Pickup } from './classes.js'
import { addKeyboardListeners } from './keyboard.js';


export const limiter = new Tone.Compressor(
    -0.1,
    20
)
const reverb = new Tone.Reverb();
const delay = new Tone.FeedbackDelay("1n", 0.2);

limiter.toDestination();


export let selfId = null;

let scale = {};


socket.on('init', function(data){
    console.log("InitPack:", data)

    selfId = data.selfId;
    setActiveNote(data.selectedNote)
    setScale(data.scale.name, data.scale.allowedNotes)

    //new:
    for(let i = 0; i<data.entities.length; i++){
        let entity = data.entities[i];
        console.log(i);

        switch(entity.type){
            case "player":
                console.log("CREATE NEW PLAYER")
                new Player(entity);
                break;
            case "bullet":
                new Bullet(entity);
                break;
            case "pickup":
                new Pickup(entity);
                break;
            default:
                console.log(`Unknown entity type: ${entity.pickup}`)
        }
    }

    requestAnimationFrame(gameLoop);
    addKeyboardListeners(isInChat, socket);
})

socket.on('update', function(data){
    //gets an array of objects to update and updates or creates them:
    console.log("updatePack:", data)

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
                    if(pack.parentId == selfId){
                        highlightPlayedNote(pack.note, pack.duration)
                    }
                }
                break;
            case "pickup":
                let pU = Pickup.list[id]
                if(!pU){
                    new Pickup(pack)
                }
        }
    }
})

socket.on('remove', function(data){
    console.log("removePack:", data)

    for(let i = 0; i<data.length; i++){
        let entity = data[i]
        let id = entity.id;

        switch(entity.type){
            case "player":
                if(!Player.list[id]){
                    console.log(`ERROR NO PLAYER WITH ID=${id}`);
                    return;
                }
                delete Player.list[id];
                break;
            case "bullet":
                if(!Bullet.list[id]){
                    console.log(`ERROR NO BULLET WITH ID=${id}`);
                    return;
                }
                Bullet.list[id].destroy();
                break;
            case "pickup":
                if(!Pickup.list[id]){
                    console.log(`ERROR NO PICKUP WITH ID=${id}`);
                    return;
                }
                Pickup.list[id].destroy();
                break;
        }
    }
})


export let isInChat = false;

canvas.onmousemove = ()=>{
    canvas.focus();
    isInChat = false;
    chatInput.placeholder = "press T to start typing"

}

canvas.onblur = ()=>{
    // alert("xd")
}




// const playBTN = document.getElementById("sound-btn");

// playBTN.addEventListener("click", ()=>{
//     if(Tone.context.state != "running")
//         Tone.start();

//     console.log(Bullet.list)
//     // synth.triggerAttackRelease("C3", "8n");
// })

const chatSendBTN = document.getElementById("chat-send-btn");
const chatInput = document.getElementById("chat-input");
chatInput.value = '';
chatInput.onclick = function(event){
    isInChat = true;
    chatInput.placeholder = "press ENTER to leave chat"

}
const chatContent = document.getElementById("chat-content");

function chatSend(){
    if(chatInput.value.length>0){
        socket.emit("chat", chatInput.value)
        chatInput.value = '';

        return true;
    } else return false;
}

chatSendBTN.addEventListener("click", ()=>{
    if(chatSend()){
        return;
    } else{
        chatInput.focus();
    }
})


//TODO sanitize chat messages, it`s really not secure haha
socket.on('chatBroadcast', (signedMsg)=>{
    chatContent.innerHTML += signedMsg + "<br>";
    chatContent.scrollTop = chatContent.scrollHeight;
})

socket.on('redirect', (destination)=>{
    window.location.href = destination;
})



const noteBTNs = document.querySelectorAll(".note")
function setActiveNote(note){
    noteBTNs.forEach((btn)=>{
            btn.classList.remove("active")
    })
    document.querySelector(`[data-note="${note}"]`).classList.add('active');
    activeNote = note;
}

function setScale(name, allowedNotes){
    scale.base = name[0];

    let scaleLabel = document.querySelector("#scaleLabel")

    scaleLabel.innerText = name;

    noteBTNs.forEach((btn)=>{
            btn.disabled = true;
    })

    for(let note of allowedNotes){
        document.querySelector(`[data-note="${note}"]`).disabled = false;
    }

    console.log(scaleLabel, name, allowedNotes)
}

function setWeaponType(type){
    let weaponTypeLabel = document.querySelector("#weaponTypeLabel")

    weaponTypeLabel.innerText = type;
}

function setDurationLabel(duration){
    let durationLabel = document.querySelector("#durationLabel");

    durationLabel.innerText = duration;
}

function highlightPlayedNote(note, duration){
    let playedNoteBTN = document.querySelector(`[data-note="${note}"]`);
    let durationMs = toneDurationToMs(duration, BPM)
    playedNoteBTN.classList.add('played');
    setTimeout(()=>{
        playedNoteBTN.classList.remove('played')
    }, durationMs-100);
}

function toneDurationToMs(duration, bpm){
    //Tone.js duration to miliseconds
    let timeMs = 60000/bpm * (4/parseInt(duration.replace("n", "")));
    return timeMs;
}

function previousNote(){
    i = notes.findIndex((n)=>{
        return n==activeNote;
    })
    let iNew = (i>0) ? (i-1) : notes.length-1
    setActiveNote(notes[iNew])
    socket.emit('noteChange', activeNote);
}

function nextNote(){
    i = notes.findIndex((n)=>{
        return n==activeNote;
    })
    let iNew = (i<notes.length-1) ? (i+1) : 0
    setActiveNote(notes[iNew])
    socket.emit('noteChange', activeNote);
}

let activeNote = null
notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

noteBTNs.forEach((item)=>{
    item.addEventListener("click", ()=>{
        canvas.focus();
        setActiveNote(item.dataset.note)

        socket.emit('noteChange', item.dataset.note)
    })
})




let timeSig = 4;
let BPM = 120;
Tone.Transport.bpm.value = 120;
Tone.Transport.timeSignature = timeSig;
let beatCounter = 0;
Tone.Transport.start();
const metronome = new Tone.Synth();
let metrVol = new Tone.Volume(-18);
metronome.chain(metrVol, Tone.Master);

// function playClick(time){
//     console.log(Tone.Transport.position)

//     if(beatCounter%timeSig === 0){
//         metronome.triggerAttackRelease("C5", "16n", time)
//     } else{
//         metronome.triggerAttackRelease("C6", "16n", time)
//     }
//     beatCounter++;
// }

// Tone.Transport.scheduleRepeat(playClick, "4n");

socket.on("tick", (data)=>{
    if(Tone.context.state !== "running") return;
    let clientNow = Date.now()

    if(Tone.Transport.state != 'started') Tone.Transport.start();
    else{
        let pitch = data.tick%8==0 ? `${scale.base}6` : `${scale.base}5`; 
        Tone.Transport.scheduleOnce((time)=>{
            metronome.triggerAttackRelease(pitch, "8n", time)
        }, Tone.Transport.toSeconds())
    }
    // console.log(data.now, data.tick, data.now - clientNow)
})

socket.on("new weapon", (data)=>{
    setWeaponType(data.type);
    setDurationLabel(data.duration)
    // console.log("new weapon", data)
})