export class Socket{
    static clientSocket = io();
    static selfId = null;

    static setSelfID(id){
        Socket.selfId = id;
    }

    static noteChange(note){
        Socket.clientSocket.emit('noteChange', note);
    };

    static weaponChange(type, code){
        Socket.clientSocket.emit('weaponChange', {
            type: type,
            code: code
        });
    }
}