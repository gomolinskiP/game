export class Socket{
    static list = {};

    constructor(socket){
        this.id = Math.random();

        Socket.list[this.id] = socket;
        console.log(this.id)
        return this;
    }
}