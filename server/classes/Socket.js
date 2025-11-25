export class Socket {
  static list = {};

  static emitToAll(eventName, data) {
    for (var i in Socket.list) {
      var socket = Socket.list[i];
      if (!socket) continue;
      socket.emit(eventName, data);
    }
  }

  static emitShootFeedbackMsg(recipient, message, rating){
    if(recipient.characterType == 'player'){
      recipient.updatePack.push({
          msg: message,
          rating: rating,
          type: "gameMsg",
      });
    }
  }

  constructor(socket) {
    this.id = Math.random();
    this.initialized = false;

    Socket.list[this.id] = socket;
    return this;
  }
}
