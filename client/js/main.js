var socket = io();

//signIn:
let signInDiv = document.getElementById("signInDiv")
let loginInput = document.getElementById("loginInput")
let passwordInput = document.getElementById("passwordInput")
let signBtn = document.getElementById("signBtn")
let signOutBtn = document.getElementById("signOutBtn")
let signUpBtn = document.getElementById("signUpBtn")

let gameWidth = 1000;
let gameHeight = 1000;


//sign IN:
signBtn.onclick = function(e){
    e.preventDefault();
    socket.emit('signIn', 
        {username: loginInput.value,
        password: passwordInput.value});
}

socket.on('signInResponse', function(data){
    if(data.success){
        signInDiv.style.display = 'none';
        signOutBtn.style.display = 'inline-block';
    }
})

//sign Out:
signOutBtn.onclick = function(e){
    e.preventDefault();
    socket.emit('signOut')
}

socket.on('signOutResponse', function(){
    ctx.clearRect(0, 0, gameWidth, gameHeight);
    signInDiv.style.display = 'inline-block';
    signOutBtn.style.display = 'none';
})

//sign UP:
signUpBtn.onclick = function(e){
    e.preventDefault();
    socket.emit('signUp', 
        {username: loginInput.value,
        password: passwordInput.value})
}
// socket.on('signUpResponse', function(data){
//     if(data.success){
//         signInDiv.style.display = 'none';
//         signOutBtn.style.display = 'inline-block';
//     }
// })


// game:
var ctx = document.getElementById("ctx").getContext("2d");
ctx.font = '30px Arial';
const image = new Image();
image.src = "../placeholder.png"

socket.on('newPosition', function(data){
    ctx.clearRect(0, 0, gameWidth, gameHeight);
    ctx.strokeStyle = "red";
    ctx.beginPath();
    ctx.roundRect(10, 20, 150, 100, 0);
    ctx.stroke();

    for(var i=0; i < data.length; i++){
        ctx.drawImage(image, data[i].x, data[i].y);
        ctx.fillText(data[i].name, data[i].x, data[i].y);
    };
})

socket.on('playTestNote', function(){
    synth.triggerAttackRelease("C" + + Math.floor(7*Math.random()), "8n");
})

socket.on('error', function(errorMsg){
    alert(errorMsg)
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