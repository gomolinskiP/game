var socket = io();

//signIn:
let signInDiv = document.getElementById("signInDiv")
let loginInput = document.getElementById("loginInput")
let passwordInput = document.getElementById("passwordInput")
let signBtn = document.getElementById("signBtn")
let signOutBtn = document.getElementById("signOutBtn")
let signUpBtn = document.getElementById("signUpBtn")


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

let gameWidth = window.innerWidth - 100;
let gameHeight = window.innerHeight - 100;

var ctx = document.getElementById("ctx").getContext("2d");
var canvas = document.getElementById("ctx")



canvasResize()

function canvasResize() {
    gameWidth = window.innerWidth - 100;
    gameHeight = window.innerHeight - 100;
    canvas.width = gameWidth;
    canvas.height = gameHeight;
};

window.addEventListener('resize', canvasResize);


const image = new Image();
image.src = "../placeholder.png"

socket.on('newPosition', function(data){
    ctx.fillStyle = "#006e56";
    ctx.strokeStyle = "red";
    ctx.fillRect(0, 0, gameWidth, gameHeight);

    ctx.beginPath();
    ctx.roundRect(10, 20, 150, 100, 0);
    ctx.stroke();

    ctx.fillStyle = "black";
    for(var i=0; i < data.length; i++){
        ctx.drawImage(image, data[i].x, data[i].y);
        ctx.textAlign = "center";
        ctx.font = '20px Arial';
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
    switch(event.key){
        case "d":
            socket.emit('keyPress', {
            inputId: 'right',
            state: true
            });
            break;
        case "s":
            socket.emit('keyPress', {
            inputId: 'down',
            state: true
            });
            break;
        case "a":
            socket.emit('keyPress', {
            inputId: 'left',
            state: true
            });
            break;
        case "w":
            socket.emit('keyPress', {
            inputId: 'up',
            state: true
            });
            break;
        case " ":
            socket.emit('noteTest');
            break;
    }

    // if(event.key === "d") //d
    //     socket.emit('keyPress', {
    //         inputId: 'right',
    //         state: true
    //     });
    // if(event.key === "s") //s
    //     socket.emit('keyPress', {
    //         inputId: 'down',
    //         state: true
    //     });
    // if(event.key === "a") //a
    //     socket.emit('keyPress', {
    //         inputId: 'left',
    //         state: true
    //     });
    // if(event.key === "w") //w
    //     socket.emit('keyPress', {
    //         inputId: 'up',
    //         state: true
    //     });
}

document.onkeyup = function(event){
    switch(event.key){
        case "d":
            socket.emit('keyPress', {
            inputId: 'right',
            state: false
            });
            break;
        case "s":
            socket.emit('keyPress', {
            inputId: 'down',
            state: false
            });
            break;
        case "a":
            socket.emit('keyPress', {
            inputId: 'left',
            state: false
            });
            break;
        case "w":
            socket.emit('keyPress', {
            inputId: 'up',
            state: false
            });
            break;
        case " ":
            socket.emit('keyPress', {
            inputId: 'space',
            state: false
            });
            break;
    }
}



const playBTN = document.getElementById("sound-btn");

const synth = new Tone.Synth().toDestination();


playBTN.addEventListener("click", ()=>{
    if(Tone.context.state != "running")
        Tone.start();

    socket.emit('noteTest')
    // synth.triggerAttackRelease("C3", "8n");
})