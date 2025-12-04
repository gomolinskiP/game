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
      recipient.updatePack.gameMsg = {
          msg: message,
          rating: rating,
      };
    }
  }

  constructor(socket) {
    this.id = Math.random();
    this.playing = false;
    this.initialized = false;
    this.progressFromDB = null;

    Socket.list[this.id] = socket;
    return this;
  }
}
