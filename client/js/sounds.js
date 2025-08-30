import { GameUI } from "./gameButtons.js";
import { Keyboard } from "./keyboard.js";

export class Sounds {
  static bpm;
  static scaleName;
  static scaleBase;
  static allowedNotes;
  static notes = [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B",
  ];

  static audioOn = false;

  static setScale(scaleName, allowedNotes) {
    Sounds.scaleName = scaleName;
    Sounds.scaleBase = scaleName[0];
    Sounds.allowedNotes = allowedNotes;
    this.setupNoteKeyboard();

    GameUI.setScaleLabel(scaleName);
    GameUI.disableDisallowedNoteKeys(allowedNotes);
  }

  static setBPM(bpm) {
    this.bpm = bpm;

    GameUI.setBPMLabel(bpm);
  }

  static setupNoteKeyboard() {
    let digit = 1;
    for (const note of Sounds.allowedNotes) {
      console.log(`allowed note ${note}`);
      Keyboard.addNoteKeyboardListener(digit, note);

      digit++;
    }
  }

  static toneDurationToMs(duration) {
    //Tone.js duration to miliseconds TOFIX no support for dotted
    let timeMs =
      (60000 / Sounds.bpm) * (4 / parseInt(duration.replace("n", "")));
    return timeMs;
  }
}
