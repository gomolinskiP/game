var socket = io();

// game:

import { gameLoop, canvas } from './graphics.js'

import { Player, Bullet, Pickup } from './classes.js'


export let synOptions = {
    noise:{
        type: "pink"
    },
    envelope:{
        attack: 0.35,
        decay: 0.15,
    }
}

export const limiter = new Tone.Compressor(
    -0.1,
    20
)
const reverb = new Tone.Reverb();
const delay = new Tone.FeedbackDelay("1n", 0.2);

limiter.toDestination();


export let selfId = null;



socket.on('init', function(data){
    selfId = data.selfId;
    setActiveNote(data.selectedNote)

    console.log("InitPack:", data)
    
    for(var i=0; i<data.player.length; i++){
        new Player(data.player[i]);
    }

    for(var i=0; i<data.bullet.length; i++){
        new Bullet(data.bullet[i]);
    }

    for(var i=0; i<data.pickup.length; i++){
        new Pickup(data.pickup[i]);
    }

    requestAnimationFrame(gameLoop);
})

socket.on('update', function(data){
    // console.log("updatePack:", data)

    for(var i=0; i<data.player.length; i++){
        let pack = data.player[i]
        let p = Player.list[pack.id]

        if(p){
            p.update(pack);   
        } else{
            new Player(data.player[i]);
        }
    }

    for(var i=0; i<data.bullet.length; i++){
        let pack = data.bullet[i]
        let b = Bullet.list[pack.id]

        if(b){
            b.update(pack);
        } else{
            let b = new Bullet(data.bullet[i]);
            
        }
    }

    for(var i=0; i<data.pickup.length; i++){
        let pack = data.pickup[i]
        let b = Pickup.list[pack.id]

        if(b){
            // b.update(pack);
        } else{
            let b = new Pickup(data.pickup[i]);
        }
    }
})

socket.on('remove', function(data){
    for(var i=0; i<data.player.length; i++){
        delete Player.list[data.player[i]]
    }
    for(var i=0; i<data.bullet.length; i++){
        Bullet.list[data.bullet[i]].destroy();
    }
    for(var i=0; i<data.pickup.length; i++){
        Pickup.list[data.pickup[i]].destroy();
    }

    // console.log("removePack:", data)
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

//key handling:
document.onkeydown = function(event){
    if(isInChat) {
        if(event.key == "Enter"){
            if(chatSend()) {
                chatInput.focus();
            } else{
                isInChat = false;
                chatInput.placeholder = "press T to start typing"

                chatInput.blur();
            }
        }
        else return
    }

    switch(event.key){
        case "d":
            socket.emit('keyPress', {
                inputId: 'right',
                state: true
            });
            break;
        case "s":
            socket.emit('keyPress', {
            inputId: 'down',
            state: true
            });
            break;
        case "a":
            socket.emit('keyPress', {
            inputId: 'left',
            state: true
            });
            break;
        case "w":
            socket.emit('keyPress', {
            inputId: 'up',
            state: true
            });
            break;
        case " ":
            socket.emit('keyPress', {
                inputId: 'space',
                state: true
            });
            break;
        case "q":
            previousNote();
            break;
        case "e":
            nextNote();
            break;
        case "t":
        case "T":
            isInChat = true;
            chatInput.focus();
            chatInput.placeholder = "press ENTER to leave chat"
            event.preventDefault();
            break;
    }
}

document.onkeyup = function(event){
    switch(event.key){
        case "d":
            socket.emit('keyPress', {
            inputId: 'right',
            state: false
            });
            break;
        case "s":
            socket.emit('keyPress', {
            inputId: 'down',
            state: false
            });
            break;
        case "a":
            socket.emit('keyPress', {
            inputId: 'left',
            state: false
            });
            break;
        case "w":
            socket.emit('keyPress', {
            inputId: 'up',
            state: false
            });
            break;
        case " ":
            socket.emit('keyPress', {
            inputId: 'space',
            state: false
            });
            break;
    }
}



const playBTN = document.getElementById("sound-btn");

playBTN.addEventListener("click", ()=>{
    if(Tone.context.state != "running")
        Tone.start();

    console.log(Bullet.list)
    // synth.triggerAttackRelease("C3", "8n");
})

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



const noteBTNs = document.querySelectorAll(".note")
function setActiveNote(note){
    noteBTNs.forEach((btn)=>{
            btn.classList.remove("active")
    })
    document.querySelector(`[data-note="${note}"]`).classList.add('active');
    activeNote = note;
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
Tone.Transport.bpm.value = 120;
Tone.Transport.timeSignature = timeSig;
let beatCounter = 0;
Tone.Transport.start();
const metronome = new Tone.PluckSynth();
let metrVol = new Tone.Volume(0);
metronome.chain(metrVol, Tone.Master);

function playClick(time){
    console.log(Tone.Transport.position)

    if(beatCounter%timeSig === 0){
        metronome.triggerAttackRelease("C5", "16n", time)
    } else{
        metronome.triggerAttackRelease("C6", "16n", time)
    }
    beatCounter++;
}

// Tone.Transport.scheduleRepeat(playClick, "4n");

// socket.on("tick", (data)=>{
//     let clientNow = Date.now()

//     if(Tone.Transport.state != 'started') Tone.Transport.start();
//     else{
//         let pitch = data.tick%8==0 ? "C6" : "C5"; 

//         Tone.Transport.scheduleOnce((time)=>{
//             metronome.triggerAttackRelease(pitch, "8n", time)
//         }, Tone.Transport.toSeconds())
//     }
//     // console.log(data.now, data.tick, data.now - clientNow)
// })