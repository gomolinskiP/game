export class Socket {
  static list = {};

  static emitToAll(eventName, data) {
    for (var i in Socket.list) {
      var socket = Socket.list[i];
      if (!socket) continue;
      socket.emit(eventName, data);
    }
  }

  constructor(socket) {
    this.id = Math.random();

    Socket.list[this.id] = socket;
    return this;
  }
}
