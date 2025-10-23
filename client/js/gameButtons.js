// import { weaponChange, noteChange } from "./main.js";
import { Socket } from "./clientSocket.js";
import { Sounds } from "./sounds.js";

const noteBTNs = document.querySelectorAll(".note");

const canvas = document.getElementById("ctx");

const scaleLabel = document.querySelector("#scaleLabel")
const bpmLabel = document.querySelector("#bpm-label")
const weaponTypeLabel = document.getElementById('weaponTypeLabel');
const durationLabel = document.querySelector("#durationLabel");
const soundLabel = document.querySelector("#sound-label");
const audioOnLabel = document.querySelector("#audio-on-label");

audioOnLabel.onclick = ()=>{
    if(Sounds.audioOn == false){
        Sounds.audioOn = true;
        audioOnLabel.innerText = '🔊'
        Tone.start()
    }
    else{
        Sounds.audioOn = false;
        audioOnLabel.innerText = '🔇'
    }
}

//hiding all UI popups:
function hideAllPopups(gameButtons){
    gameButtons.forEach((button)=>{
        if(button.matches(':hover')) return;
        button.classList.remove('active');
        for(const child of button.children){
            if(child.className == 'game-button-popup'){
                child.style.display = 'none';
            }
        }
    })
}

//showing a UI popup being a child of a clicked element:
function showPopup(button){
    button.classList.add('active');
    for(const child of button.children){
        if(child.className == 'game-button-popup'){
            child.style.display = 'block';
        }
    }
}

//manage showing and hiding popups on mouse interaction:
let popupHideTimeout;
let gameButtons = document.querySelectorAll(".game-button");
gameButtons.forEach((button)=>{
    button.onmouseover = ()=>{
        hideAllPopups(gameButtons);
        showPopup(button);
    }

    button.onmouseout = ()=>{
        if(popupHideTimeout) clearTimeout(popupHideTimeout);
        popupHideTimeout = setTimeout(()=>{
            hideAllPopups(gameButtons);
        }, 100);
    }
})

//manage emitting change weapon requests on in-popup button clicks:
let weaponChangePopups = document.querySelectorAll(".game-button-popup");
weaponChangePopups.forEach((popup)=>{
    const type = popup.dataset.type;
    let popupButtons = popup.querySelectorAll('li');
    popupButtons.forEach((button)=>{
        const code = button.dataset.code;
        button.onclick = ()=>{
            Socket.weaponChange(type, code);
        }
    })
})

function noteClick(item){
    canvas.focus();
    GameUI.setActiveNote(item.dataset.note);
    Socket.noteChange(item.dataset.note);
}

//manage emitting note change requests:
noteBTNs.forEach((item)=>{
    item.addEventListener("click", ()=>{
        noteClick(item);
    })
})


//game UI exports class:
export class GameUI{
    static setScaleLabel(scaleName){
        scaleLabel.innerText = scaleName;
    }

    static setBPMLabel(bpm){
        bpmLabel.innerText = bpm;
    }

    static disableDisallowedNoteKeys(allowedNotes){
        //disable not allowed note keys on piano keyboard
        noteBTNs.forEach((btn)=>{
                btn.disabled = true;
        })

        //allow only matching notes:
        for(let note of allowedNotes){
            document.querySelector(`[data-note="${note}"]`).disabled = false;
        }
    }

    static setActiveNote(note){
        //remove active class for all:
        noteBTNs.forEach((btn)=>{
            btn.classList.remove("active")
        })

        //add active class for matching keyboard key button:
        document.querySelector(`[data-note="${note}"]`).classList.add('active');
    }

    static highlightPlayedNote(note, duration){
        const playedNoteBTN = document.querySelector(`[data-note="${note}"]`);
        const durationMs = Sounds.toneDurationToMs(duration);

        playedNoteBTN.classList.add('played');
        setTimeout(()=>{
            playedNoteBTN.classList.remove('played')
        }, durationMs-100);
    }

    static reorderKeyboardKeys(startNote){
        //reorders keyboard to make it start from the current scale's base note:
        const notes = Array.from(document.querySelectorAll("#keyboard .note"));
        const noteNames = notes.map((n) => n.dataset.note);
        const startIndex = noteNames.indexOf(startNote);
        if (startIndex === -1) return;

        const reordered = notes
            .slice(startIndex)
            .concat(notes.slice(0, startIndex));

        reordered.forEach((btn, i) => {
            btn.style.setProperty("--pos", i);
        });
    }

    static setWeaponType(type){
        weaponTypeLabel.innerText = type;
    }

    static setDurationLabel(duration){
        durationLabel.innerText = duration;
    }
    
    static setSoundLabel(sound){
        soundLabel.innerText = sound;
    }

    static highlightMetronome(color){
        if(bpmLabel.matches(':hover')) return;
        bpmLabel.classList.add(color)

        setTimeout(()=>{
            bpmLabel.classList.remove(color)
        }, 200)
    }

    static highlightTimingHelper(){
        console.log('highlitin')
        durationLabel.classList.add("red");
        setTimeout(() => {
            durationLabel.classList.remove("red");
        }, 200);
    }
}
