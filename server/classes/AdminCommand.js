export class AdminCommand{
    static get(msg){
        const command = msg.slice(1);
        console.log(command);

    }
}