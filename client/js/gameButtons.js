import { weaponChange } from "./main.js";

const noteBTNs = document.querySelectorAll(".note");

const scaleLabel = document.querySelector("#scaleLabel")
const scalePopup = document.getElementById("scale-popup");

const weaponTypeLabel = document.querySelector("#weaponTypeLabel")
const weaponTypePopup = document.getElementById("weapon-type-popup");

const durationLabel = document.querySelector("#durationLabel")
const durationPopup = document.getElementById("duration-popup");

export function setScale(scale, name, allowedNotes){
    scale.base = name[0];
    scaleLabel.innerText = name;

    noteBTNs.forEach((btn)=>{
            btn.disabled = true;
    })

    for(let note of allowedNotes){
        document.querySelector(`[data-note="${note}"]`).disabled = false;
    }
}

// scaleLabel.onclick = ()=>{
//     if(window.getComputedStyle(scalePopup).getPropertyValue('display') == 'none'){
//         weaponTypePopup.style.display = 'none';
//         durationPopup.style.display = 'none';
//         scalePopup.style.display = 'block';
//     }
//     else{
//         scalePopup.style.display = 'none';
//     }
// }

// weaponTypeLabel.onclick = ()=>{
//     if(window.getComputedStyle(weaponTypePopup).getPropertyValue('display') == 'none'){
//         scalePopup.style.display = 'none';
//         durationPopup.style.display = 'none';
//         weaponTypePopup.style.display = 'block';
//     }
//     else{
//         weaponTypePopup.style.display = 'none';
//     }
// }

// durationLabel.onclick = ()=>{
//     if(window.getComputedStyle(durationPopup).getPropertyValue('display') == 'none'){
//         scalePopup.style.display = 'none';
//         weaponTypePopup.style.display = 'none';
//         durationPopup.style.display = 'block';
//     }
//     else{
//         durationPopup.style.display = 'none';
//     }
// }

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

function showPopup(button){
    button.classList.add('active');
    for(const child of button.children){
        if(child.className == 'game-button-popup'){
            child.style.display = 'block';
        }
    }
}

let buttonsHideTimeout;

let gameButtons = document.querySelectorAll(".game-button");
gameButtons.forEach((button)=>{
    button.onmouseover = ()=>{
        hideAllPopups(gameButtons);
        showPopup(button);
    }

    button.onmouseout = ()=>{
        if(buttonsHideTimeout) clearTimeout(buttonsHideTimeout);
        buttonsHideTimeout = setTimeout(()=>{
            hideAllPopups(gameButtons);
        }, 100);
        // hideAllPopups(gameButtons);
    }
})

let weaponChangeButtons = document.querySelectorAll(".game-button-popup li");
weaponChangeButtons.forEach((button)=>{
    button.onclick = ()=>{
        console.log(button.dataset.code)
        weaponChange(button.dataset.code)
    }
})

