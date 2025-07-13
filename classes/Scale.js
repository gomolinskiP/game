export class Scale{
    static notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
    static majorIntervals = [2, 2, 1, 2, 2, 2, 1];
    static minorIntervals = [2, 1, 2, 2, 1, 2, 2];

    constructor(base, type){
        this.base = base;
        this.type = type;

        this.allowedNotes = this.getAllowedNotes(this.base, this.type);

        

        console.log(this.allowedNotes)
    }

    getAllowedNotes(base, type){
        let scaleNotes = []

        let isBase = (note)=>note==base;
        let baseIndex = Scale.notes.findIndex(isBase);

        scaleNotes.push(Scale.notes[baseIndex])

        let intervals;
        switch(type){
            case 'major':
                intervals = Scale.majorIntervals;
                break;
            case 'minor':
                intervals = Scale.minorIntervals;
        }
    
        let noteIndex = baseIndex;
        for(let intervalIndex = 0; intervalIndex<intervals.length; intervalIndex++){
            noteIndex = noteIndex + intervals[intervalIndex];
            if(noteIndex > 11) noteIndex = noteIndex - 12;
            scaleNotes.push(Scale.notes[noteIndex])
        }

        return scaleNotes;
    }
}