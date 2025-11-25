import { Socket } from "./clientSocket.js";

const canvas = document.getElementById('ctx');

export class TextChat{

    static isInChat = false;

    static chatInit(socket){
        const chatSendBTN = document.getElementById("chat-send-btn");
        const chatInput = document.getElementById("chat-input");
        const chatContent = document.getElementById("chat-content");

        chatInput.value = "";

        function enterChat() {
            chatInput.focus();
            canvas.blur();
            TextChat.isInChat = true;
            chatInput.placeholder = "press ENTER to leave chat";
        }

        function leaveChat() {
            canvas.focus();
            chatInput.blur();
            TextChat.isInChat = false;
            chatInput.placeholder = "press T to start typing";
        }

        function chatSend() {
            if (chatInput.value.length > 0) {
                socket.emit("chat", chatInput.value);
                chatInput.value = "";

                return true;
            } else return false;
        }

        chatSendBTN.addEventListener("click", () => {
            if (chatSend()) {
                return;
            } else {
                enterChat();
            }
        });

        canvas.onmousemove = () => {
            leaveChat();
        };

        chatInput.onclick = function (event) {
            enterChat();
        };

        socket.on("chatBroadcast", (signedMsg) => {
            chatContent.innerHTML += signedMsg + "<br>";
            chatContent.scrollTop = chatContent.scrollHeight;
        });
    }
}
