import { Socket } from "./clientSocket.js";
import { TextChat } from "./textChat.js";
import { Sounds } from "./sounds.js";
import { GameUI } from "./gameButtons.js";
import { Graphics } from "./graphics.js";

let spacePressed = false;

let canvasClicked;
const canvas = document.getElementById('ctx');
canvas.onmousedown = (event)=>{
    canvasClicked = true;
}
canvas.onmouseleave = canvas.onmouseup = ()=>{
    canvasClicked = false;
    lastDir = []
    Socket.pressingDirection("up", false);
    Socket.pressingDirection("down", false);
    Socket.pressingDirection("left", false);
    Socket.pressingDirection("right", false);
    
}

const directions = {
    N: ['up'],
    NE: ['up', 'right'],
    E: ['right'],
    SE: ['down', 'right'],
    S: ['down'],
    SW: ['down', 'left'],
    W: ['left'],
    NW: ['up', 'left']
}

let lastDir = [];
canvas.addEventListener('mousemove', (event)=>{
    if(!canvasClicked) return;

    const dx = event.clientX - window.innerWidth/2;
    const dy = event.clientY - window.innerHeight/2;

    const angleRad = Math.atan2(dy, dx);
    const angleDeg = angleRad * 180 / Math.PI + 180;
    const snappedDeg = Math.round(angleDeg / 45) * 45;

    let dir;

    // Socket.pressingDirection("up", false);
    // Socket.pressingDirection("down", false);
    // Socket.pressingDirection("left", false);
    // Socket.pressingDirection("right", false);
    switch(snappedDeg){
        case 0:
        case 360:
            dir = "W"
            break;
        case 45:
            dir = "NW"
            break;
        case 90:
            dir = "N"
            break;
        case 135:
            dir = "NE"
            break;
        case 180:
            dir = "E"
            break;
        case 225:
            dir = "SE"
            break;
        case 270:
            dir = "S"
            break;
        case 315:
            dir = "SW"
            break;
    }

    if(dir == lastDir) return;

    // for(const key in directions[lastDir]){
    //     Socket.pressingDirection(key, false)
    // }
    Socket.pressingDirection("up", false);
    Socket.pressingDirection("down", false);
    Socket.pressingDirection("left", false);
    Socket.pressingDirection("right", false);
    for(const key of directions[dir]){
        Socket.pressingDirection(key, true);
    }

    lastDir = dir;


})

let pressedKeys = {};

export class Keyboard{
    static addNoteKeyboardListener(digit){
        if(digit>9) return;

        addEventListener("keydown", (event)=>{
            if(event.key == `${digit}`){
                if(pressedKeys[digit]) return;
                pressedKeys[digit] = true;

                const note = Sounds.allowedNotes[digit - 1];

                Socket.noteFire(note);
                GameUI.setActiveNote(note);
            }
        })

        addEventListener("keyup", (event)=>{
            if(event.key == `${digit}`){
                pressedKeys[digit] = false;
            }
        })
    }
}

export function addKeyboardListeners(socket){
    const chatInput = document.getElementById("chat-input")
    const chatSendBTN = document.getElementById("chat-send-btn");
    //key handling:
    document.onkeydown = function(event){
        if(TextChat.isInChat) {
            if(event.key == "Enter"){
                if(chatSend()) {
                    chatInput.focus();
                } else{
                    TextChat.isInChat = false;
                    chatInput.placeholder = "press T to start typing"

                    chatInput.blur();
                }
            }
            else return
        }

        switch(event.key){
            case "ArrowRight":
                socket.emit('keyPress', {
                    inputId: 'right',
                    state: true
                });
                break;
            case "ArrowDown":
                socket.emit('keyPress', {
                inputId: 'down',
                state: true
                });
                break;
            case "ArrowLeft":
                socket.emit('keyPress', {
                inputId: 'left',
                state: true
                });
                break;
            case "ArrowUp":
                socket.emit('keyPress', {
                inputId: 'up',
                state: true
                });
                break;
            case " ":
                if(spacePressed) return;
                spacePressed = true;
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
                TextChat.isInChat = true;
                chatInput.focus();
                chatInput.placeholder = "press ENTER to leave chat"
                event.preventDefault();
                break;
            case "+":
            case "=":
                Graphics.changeZoomLevel('up');
                break;
            case "-":
            case "_":
                Graphics.changeZoomLevel('down');
                break;
        }
    }

    document.onkeyup = function(event){
        switch(event.key){
            case "ArrowRight":
                socket.emit('keyPress', {
                inputId: 'right',
                state: false
                });
                break;
            case "ArrowDown":
                socket.emit('keyPress', {
                inputId: 'down',
                state: false
                });
                break;
            case "ArrowLeft":
                socket.emit('keyPress', {
                inputId: 'left',
                state: false
                });
                break;
            case "ArrowUp":
                socket.emit('keyPress', {
                inputId: 'up',
                state: false
                });
                break;
            case " ":
                spacePressed = false;
                // socket.emit('keyPress', {
                // inputId: 'space',
                // state: false
                // });
                break;
        }
    }

    function chatSend(){
        if(chatInput.value.length>0){
            socket.emit("chat", chatInput.value)
            chatInput.value = '';

            return true;
        } else return false;
    }       
}

