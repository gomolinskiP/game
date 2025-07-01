var socket = io();

// game:

let gameWidth = window.innerWidth;
let gameHeight = window.innerHeight;

var canvas = document.getElementById("ctx");
canvas.tabIndex = 1000; //so I can listen to events on canvas specifically
var ctx = canvas.getContext("2d");


class Entity{
    constructor(initPack){
        this.x = initPack.x;
        this.y = initPack.y;
        this.id = initPack.id;

        this.pan3d = new Tone.Panner3D(
            0,
            0,
            0
        );
        this.pan3d.panningModel = "HRTF";
        // this.pan3d.distanceModel = "inverse";
        this.pan3d.connect(limiter);
    }

    update(pack){
        this.x = pack.x
        this.y = pack.y
        if(Player.list[selfId]){
            this.pan3d.setPosition(
                (this.x - Player.list[selfId].x)*0.1,
                (this.y - Player.list[selfId].y)*0.1,
                0
            );
        }
    }
}

class Player extends Entity{
    static list = {};

    constructor(initPack){
        super(initPack);
        this.name = initPack.name;
        this.hp = initPack.hp;
        this.synthTimeout = false;
        this.footstepSyn = new Tone.NoiseSynth(synOptions);
        
        this.footstepSyn.connect(this.pan3d);

        Player.list[this.id] = this;
    }

    update(pack){
        this.hp = pack.hp;
        if(this.x !== pack.x || this.y !== pack.y){
            super.update(pack);

            if(!this.synthTimeout){
                this.synthTimeout = true;
                this.footstepSyn.triggerAttackRelease("128n");
                setTimeout(()=>{
                    this.synthTimeout = false;
                }, 250);
            }
        }
    }
}

class Bullet extends Entity{
    static list = {};

    constructor(initPack){
        super(initPack);
        this.note = initPack.note;

        // let synthClass = Tone[initPack.sound];
        this.synth = new Tone[initPack.sound];
        this.pan3d.setPosition(
            (this.x - Player.list[selfId].x)*0.1,
            (this.y - Player.list[selfId].y)*0.1,
            0
        )
        this.synth.connect(this.pan3d);

        Bullet.list[this.id] = this;

        this.interval = setInterval(()=>{
            // this.synth.triggerAttackRelease("C5", "64n");
        }, 200);

        this.synth.triggerAttack(`${this.note}5`);
    }

    destroy(){
        clearInterval(this.interval);
        this.synth.triggerRelease();
        this.synth.triggerAttack(`${this.note}4`);

        setTimeout(()=>{
            this.synth.triggerRelease();
            this.synth.dispose();
            this.pan3d.dispose();
            delete Bullet.list[this.id]
        }, 250);
    }
}

class Pickup extends Entity{
    static list = {}

    constructor(initPack){
        super(initPack);
        Pickup.list[this.id] = this;
    }

    destroy(){
        delete Pickup.list[this.id];
    }
}

let synOptions = {
    noise:{
        type: "pink"
    },
    envelope:{
        attack: 0.35,
        decay: 0.15,
    }
}

const limiter = new Tone.Compressor(
    -0.1,
    20
)
const reverb = new Tone.Reverb();
// limiter.connect(reverb)
limiter.toDestination();


let selfId = null;

canvasResize()

function canvasResize() {
    gameWidth = window.innerWidth;
    gameHeight = window.innerHeight - 50;
    canvas.width = gameWidth;
    canvas.height = gameHeight;
};

window.addEventListener('resize', canvasResize);


const Img = {}

Img.player = new Image();
Img.player.src = "../img/placeholder.png"

Img.map = new Image();
Img.map.src = "../img/map.jpg"

function drawMap(){
    if(Player.list[selfId]){
        let x = gameWidth/2 - Player.list[selfId].x;
        let y = gameHeight/2 - Player.list[selfId].y;
        ctx.drawImage(Img.map, x, y)
    }
    
}

socket.on('init', function(data){
    selfId = data.selfId;
    setActiveNote(data.selectedNote)

    console.log("InitPack:", data)
    
    for(var i=0; i<data.player.length; i++){
        new Player(data.player[i]);
    }

    for(var i=0; i<data.bullet.length; i++){
        new Bullet(data.bullet[i]);
    }

    for(var i=0; i<data.pickup.length; i++){
        new Pickup(data.pickup[i]);
    }
})

socket.on('update', function(data){
    // console.log("updatePack:", data)

    for(var i=0; i<data.player.length; i++){
        let pack = data.player[i]
        let p = Player.list[pack.id]

        if(p){
            p.update(pack);   
        } else{
            new Player(data.player[i]);
        }
    }

    for(var i=0; i<data.bullet.length; i++){
        let pack = data.bullet[i]
        let b = Bullet.list[pack.id]

        if(b){
            b.update(pack);
        } else{
            let b = new Bullet(data.bullet[i]);
            
        }
    }

    for(var i=0; i<data.pickup.length; i++){
        let pack = data.pickup[i]
        let b = Pickup.list[pack.id]

        if(b){
            // b.update(pack);
        } else{
            let b = new Pickup(data.pickup[i]);
        }
    }
})

socket.on('remove', function(data){
    for(var i=0; i<data.player.length; i++){
        delete Player.list[data.player[i]]
    }
    for(var i=0; i<data.bullet.length; i++){
        Bullet.list[data.bullet[i]].destroy();
    }
    for(var i=0; i<data.pickup.length; i++){
        Pickup.list[data.pickup[i]].destroy();
    }

    // console.log("removePack:", data)
})

//game Loop:
function gameLoop(){
    // console.log(Player.list)
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, gameWidth, gameHeight);
    drawMap()

    ctx.fillStyle = "black";
    for(var i in Pickup.list){
        let x = Pickup.list[i].x - Player.list[selfId].x + gameWidth/2;
        let y = Pickup.list[i].y - Player.list[selfId].y + gameHeight/2;

        ctx.fillRect(x-15, y-15, 30, 30);
    }


    
    for(var i in Player.list){
        ctx.textAlign = "center";


        let x = Player.list[i].x - Player.list[selfId].x + gameWidth/2;
        let y = Player.list[i].y - Player.list[selfId].y + gameHeight/2;

        if(Player.list[i].id == selfId){
            //hp bar:
            ctx.fillStyle = "grey";
            ctx.fillRect(20, 20, 100, 16)
            ctx.fillStyle = "red";
            ctx.fillRect(20, 20, (Player.list[i].hp/100)*100, 16)
            ctx.fillStyle = "black";
            ctx.font = 'bold 18px Cascadia Mono';
            ctx.fillText(Player.list[i].hp, 70, 35);

            // ctx.filter = "hue-rotate(180deg)"
            ctx.font = 'bold 20px Cascadia Mono';
        }
        else{
            //hp bar:
            ctx.fillStyle = "grey";
            ctx.fillRect(x-25, y-58, 50, 8)
            ctx.fillStyle = "red";
            ctx.fillRect(x-25, y-58, (Player.list[i].hp/100)*50, 8)
            ctx.fillStyle = "black";
            ctx.font = '12px Cascadia Mono';
            ctx.fillText(Player.list[i].hp, x, y-50);

            ctx.filter = "none";
            ctx.font = '16px Cascadia Mono';
        }    
        ctx.drawImage(Img.player, x-32, y-32);
        ctx.fillText(Player.list[i].name, x, y-32);
    };

    for(var i in Bullet.list){
        let x = Bullet.list[i].x - Player.list[selfId].x + gameWidth/2;
        let y = Bullet.list[i].y - Player.list[selfId].y + gameHeight/2;

        ctx.fillRect(x-5, y-5, 10, 10);
    }
    requestAnimationFrame(gameLoop)
}
requestAnimationFrame(gameLoop);

canvas.onmousemove = ()=>{
    canvas.focus();
    isInChat = false;
    chatInput.placeholder = "press T to start typing"

}

canvas.onblur = ()=>{
    // alert("xd")
}

let isInChat = false;
//key handling:
document.onkeydown = function(event){
    if(isInChat) {
        if(event.key == "Enter"){
            if(chatSend()) {
                chatInput.focus();
            } else{
                isInChat = false;
                chatInput.placeholder = "press T to start typing"

                chatInput.blur();
            }
        }
        else return
    }

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
            socket.emit('keyPress', {
                inputId: 'space',
                state: true
            });
            break;
        case "q":
            previousNote();
            break;
        case "e":
            nextNote();
            break;
        case "t":
        case "T":
            isInChat = true;
            chatInput.focus();
            chatInput.placeholder = "press ENTER to leave chat"
            event.preventDefault();
            break;
    }
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

playBTN.addEventListener("click", ()=>{
    if(Tone.context.state != "running")
        Tone.start();

    console.log(Bullet.list)
    // synth.triggerAttackRelease("C3", "8n");
})

const chatSendBTN = document.getElementById("chat-send-btn");
const chatInput = document.getElementById("chat-input");
chatInput.value = '';
chatInput.onclick = function(event){
    isInChat = true;
    chatInput.placeholder = "press ENTER to leave chat"

}
const chatContent = document.getElementById("chat-content");

function chatSend(){
    if(chatInput.value.length>0){
        socket.emit("chat", chatInput.value)
        chatInput.value = '';

        return true;
    } else return false;
}

chatSendBTN.addEventListener("click", ()=>{
    if(chatSend()){
        return;
    } else{
        chatInput.focus();
    }
})


//TODO sanitize chat messages, it`s really not secure haha
socket.on('chatBroadcast', (signedMsg)=>{
    chatContent.innerHTML += signedMsg + "<br>";
    chatContent.scrollTop = chatContent.scrollHeight;
})



const noteBTNs = document.querySelectorAll(".note")
function setActiveNote(note){
    noteBTNs.forEach((btn)=>{
            btn.classList.remove("active")
    })
    document.querySelector(`[data-note="${note}"]`).classList.add('active');
    activeNote = note;
}

function previousNote(){
    i = notes.findIndex((n)=>{
        return n==activeNote;
    })
    let iNew = (i>0) ? (i-1) : notes.length-1
    setActiveNote(notes[iNew])
    socket.emit('noteChange', activeNote);
}

function nextNote(){
    i = notes.findIndex((n)=>{
        return n==activeNote;
    })
    let iNew = (i<notes.length-1) ? (i+1) : 0
    setActiveNote(notes[iNew])
    socket.emit('noteChange', activeNote);
}

let activeNote = null
notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

noteBTNs.forEach((item)=>{
    item.addEventListener("click", ()=>{
        canvas.focus();
        setActiveNote(item.dataset.note)

        socket.emit('noteChange', item.dataset.note)
    })
})




let timeSig = 4;
Tone.Transport.bpm.value = 120;
Tone.Transport.timeSignature = timeSig;
let beatCounter = 0;
Tone.Transport.start();
const metronome = new Tone.Synth();
let metrVol = new Tone.Volume(-24);
metronome.chain(metrVol, Tone.Master);

function playClick(time){
    console.log(Tone.Transport.position)

    if(beatCounter%timeSig === 0){
        metronome.triggerAttackRelease("C5", "8n", time)
    } else{
        metronome.triggerAttackRelease("C6", "8n", time)
    }
    beatCounter++;
}

// Tone.Transport.scheduleRepeat(playClick, "4n");

socket.on("tick", (data)=>{
    let clientNow = Date.now()

    if(Tone.Transport.state != 'started') Tone.Transport.start();

    let pitch = data.tick%4==0 ? "C6" : "C5"; 

    Tone.Transport.scheduleOnce((time)=>{
        metronome.triggerAttackRelease(pitch, "8n", time)
    }, Tone.Transport.toSeconds())

    console.log(data.now, data.tick, data.now - clientNow)
})