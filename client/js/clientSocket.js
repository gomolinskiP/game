export class Socket {
  static clientSocket = io();
  static selfId = null;

  static setSelfID(id) {
    Socket.selfId = id;
  }

  static pressingDirection(direction, state){
    Socket.clientSocket.emit("keyPress", {
        inputId: direction,
        state: state,
    });
  }

  static noteChange(note) {
    Socket.clientSocket.emit("noteChange", note);
  }

  static weaponChange(type, code) {
    Socket.clientSocket.emit("weaponChange", {
      type: type,
      code: code,
    });
  }

  static noteFire(note) {
    console.log(note)
    Socket.clientSocket.emit("noteFire", note);
  }

  static respawn(){
    console.log("respawn")
    Socket.clientSocket.emit("respawn");
  }
}
