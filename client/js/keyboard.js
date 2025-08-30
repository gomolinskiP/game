import { Socket } from "./clientSocket.js";
import { setIsInChat, getIsInChat } from "./main.js";
import { Sounds } from "./sounds.js";
import { GameUI } from "./gameButtons.js";

let spacePressed = false;

export class Keyboard{
    static addNoteKeyboardListener(digit, note){
        if(digit>9) return;
        console.log(`digit ${digit} | note ${note}`)

        addEventListener("keydown", (event)=>{
            if(event.key == `${digit}`){
                console.log(`pressed ${digit}`)
                Socket.noteFire(note);
                GameUI.setActiveNote(note);
            }
        })
    }
}

export function addKeyboardListeners(socket){
    const chatInput = document.getElementById("chat-input")
    const chatSendBTN = document.getElementById("chat-send-btn");
    //key handling:
    document.onkeydown = function(event){
        if(getIsInChat()) {
            if(event.key == "Enter"){
                if(chatSend()) {
                    chatInput.focus();
                } else{
                    setIsInChat(false);
                    chatInput.placeholder = "press T to start typing"

                    chatInput.blur();
                }
            }
            else return
        }

        switch(event.key){
            case "d":
            case "D":
                socket.emit('keyPress', {
                    inputId: 'right',
                    state: true
                });
                break;
            case "s":
            case "S":
                socket.emit('keyPress', {
                inputId: 'down',
                state: true
                });
                break;
            case "a":
            case "A":
                socket.emit('keyPress', {
                inputId: 'left',
                state: true
                });
                break;
            case "w":
            case "W":
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
                setIsInChat(true);
                chatInput.focus();
                chatInput.placeholder = "press ENTER to leave chat"
                event.preventDefault();
                break;
        }
    }

    document.onkeyup = function(event){
        switch(event.key){
            case "d":
            case "D":
                socket.emit('keyPress', {
                inputId: 'right',
                state: false
                });
                break;
            case "s":
            case "S":
                socket.emit('keyPress', {
                inputId: 'down',
                state: false
                });
                break;
            case "a":
            case "A":
                socket.emit('keyPress', {
                inputId: 'left',
                state: false
                });
                break;
            case "w":
            case "W":
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

