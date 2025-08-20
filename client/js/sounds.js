import { GameUI } from "./gameButtons.js";

export class Sounds{
    static bpm;
    static scaleName;
    static scaleBase;

    static audioOn = false;

    static setScale(scaleName, allowedNotes){
        Sounds.scaleName = scaleName;
        Sounds.scaleBase = scaleName[0];

        GameUI.setScaleLabel(scaleName);
        GameUI.disableDisallowedNoteKeys(allowedNotes);
    }

    static setBPM(bpm){
        this.bpm = bpm;

        GameUI.setBPMLabel(bpm);
    }

    static toneDurationToMs(duration){
        //Tone.js duration to miliseconds
        let timeMs = 60000/Sounds.bpm * (4/parseInt(duration.replace("n", "")));
        return timeMs;
    }
}