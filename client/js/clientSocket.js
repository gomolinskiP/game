
export class Socket {
  static clientSocket = io();
  static selfId = null;
  static gameLoaded = false;

  static setSelfID(id) {
    Socket.selfId = id;
  }

  static pressingDirection(key, state){
    Socket.clientSocket.emit("keyPress", {
        inputId: key,
        state: state,
    });
  }

  // static noteChange(note) {
  //   Socket.clientSocket.emit("noteChange", note);
  // }

  static weaponChange(type, code) {
    Socket.clientSocket.emit("weaponChange", {
      type: type,
      code: code,
    });
  }

  static noteFire(note) {
    //TODO should just pass the number of allowed note to prevent different notes
    console.log(note)
    Socket.clientSocket.emit("noteFire", {note: note, time: Date.now()});
  }

  static respawn(){
    console.log("respawn")
    Socket.clientSocket.emit("respawn");
  }
}

// TextChat.chatInit();