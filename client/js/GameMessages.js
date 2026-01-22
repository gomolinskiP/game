import { Socket } from "./clientSocket.js";
const socket = Socket.clientSocket;

const gameMessagesContent = document.getElementById("game-messages-content");

export class GameMessages{

    static lastMessages = [];
    static timeout;

    static updateUI(){
        let newContent = '';
        const length = GameMessages.lastMessages.length;

        for(let i = length-1; i>=0; i--){
            const message = GameMessages.lastMessages[i];
            newContent = newContent + message + '<br>';
        }

        gameMessagesContent.innerHTML = newContent;
    }

    static init(){
        socket.on("gameMessageBroadcast", (message) => {
            GameMessages.lastMessages.push(message);
            GameMessages.updateUI();

            GameMessages.timeout = setTimeout(()=>{
                GameMessages.lastMessages.shift();
                GameMessages.updateUI();
            }, 60000);
        });
    }
}