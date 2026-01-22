import { Socket } from "../Socket.js";

export class Scale {
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
    static majorIntervals = [2, 2, 1, 2, 2, 2, 1];
    static minorIntervals = [2, 1, 2, 2, 1, 2, 2];

    constructor(base, type) {
        this.setScale(base, type);
    }

    setScale(base, type) {
        this.base = base;
        this.type = type;

        this.allowedNotes = this.getAllowedNotes(this.base, this.type);

        Socket.emitToAll("scaleChange", {
            name: `${this.base} ${this.type}`,
            allowedNotes: this.allowedNotes,
        });
    }

    changeToRelative() {
        //base -3 / +9
        const newBase = this.getTransposed(this.base, 9);

        //switch from major to minor or vice-versa:
        let newType;
        if (this.type == "major") {
            newType = "minor";
        } else {
            newType = "major";
        }

        this.setScale(newBase, newType);
    }

    changeToDominant() {
        let newBase = this.getTransposed(this.base, 7);

        this.setScale(newBase, this.type);
    }

    changeToSubdominant() {
        let newBase = this.getTransposed(this.base, 5);

        this.setScale(newBase, this.type);
    }

    getAllowedNotes(base, type) {
        let scaleNotes = [];

        let isBase = (note) => note == base;
        let baseIndex = Scale.notes.findIndex(isBase);

        scaleNotes.push(Scale.notes[baseIndex]);

        let intervals;
        switch (type) {
            case "major":
                intervals = Scale.majorIntervals;
                break;
            case "minor":
                intervals = Scale.minorIntervals;
        }

        let noteIndex = baseIndex;
        for (
            let intervalIndex = 0;
            intervalIndex < intervals.length;
            intervalIndex++
        ) {
            noteIndex = noteIndex + intervals[intervalIndex];
            if (noteIndex > 11) noteIndex = noteIndex - 12;
            scaleNotes.push(Scale.notes[noteIndex]);
        }

        return scaleNotes;
    }

    getTransposed(note, transposition) {
        let isNote = (n) => n == note;

        let noteIndex = Scale.notes.findIndex(isNote);
        let newIndex = noteIndex;

        for (let i = 0; i < transposition; i++) {
            newIndex++;
            if (newIndex > 11) newIndex = newIndex - 12;
        }

        if (!this.allowedNotes.includes(Scale.notes[newIndex])) {
            //if transposed note is not allowed within current scale, we take the previous one - it means the chord is not a major third, but a minor third chord
            newIndex -= 1;
            if(newIndex<0) newIndex += 12;
        }
        return Scale.notes[newIndex];
    }
}
