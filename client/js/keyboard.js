//TODO move key handling here
export function addKeyboardListeners(isInChat, socket){
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

}

