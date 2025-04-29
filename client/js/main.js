var socket = io();

var ctx = document.getElementById("ctx").getContext("2d");
ctx.font = '30px Arial';

socket.on('newPosition', function(data){
    ctx.clearRect(0, 0, 500, 500);
    for(var i=0; i < data.length; i++){
        ctx.fillText(data[i].number, data[i].x, data[i].y);
    };
})

socket.on('playTestNote', function(){
    synth.triggerAttackRelease("C" + + Math.floor(7*Math.random()), "8n");
})



document.onkeydown = function(event){
    if(event.keyCode === 68) //d
        socket.emit('keyPress', {
            inputId: 'right',
            state: true
        });
    if(event.keyCode === 83) //s
        socket.emit('keyPress', {
            inputId: 'down',
            state: true
        });
    if(event.keyCode === 65) //a
        socket.emit('keyPress', {
            inputId: 'left',
            state: true
        });
    if(event.keyCode === 87) //w
        socket.emit('keyPress', {
            inputId: 'up',
            state: true
        });
}

document.onkeyup = function(event){
    if(event.keyCode === 68) //d
        socket.emit('keyPress', {
            inputId: 'right',
            state: false
        });
    if(event.keyCode === 83) //s
        socket.emit('keyPress', {
            inputId: 'down',
            state: false
        });
    if(event.keyCode === 65) //a
        socket.emit('keyPress', {
            inputId: 'left',
            state: false
        });
    if(event.keyCode === 87) //w
        socket.emit('keyPress', {
            inputId: 'up',
            state: false
        });
}



const playBTN = document.getElementById("sound-btn");

const synth = new Tone.Synth().toDestination();


playBTN.addEventListener("click", ()=>{
    if(Tone.context.state != "running")
        Tone.start();

    socket.emit('noteTest')
    // synth.triggerAttackRelease("C3", "8n");
})