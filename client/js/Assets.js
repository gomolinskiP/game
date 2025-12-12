export class Images {
    static Img = {};

    static loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () =>
                reject(new Error(`Image cannot be loaded: ${src}`));
            img.src = src;
        });
    }

    static async loadImages() {
        const directions = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];

        const loading = [];

        // PLAYER
        this.Img.player = new Image();
        this.Img.player.src = "../img/char/s1.png";

        loading.push(this.loadImage("../img/char/s1.png").then(img => {
            this.Img.player = img;
        }));

        // PLAYER ANIMATIONS
        this.Img.playerAnim = {};
        for (let dir of directions) {
            this.Img.playerAnim[dir] = {};

            for (let i = 0; i < 3; i++) {
                const src = `../img/char/${dir}${i + 1}.png`;

                loading.push(this.loadImage(src).then(img => {
                    this.Img.playerAnim[dir][i] = img;
                }));
            }
        }

        // BOT ANIMATIONS
        this.Img.botAnim = {};
        for (let dir of directions) {
            this.Img.botAnim[dir] = {};

            for (let i = 0; i < 3; i++) {
                const src = `../img/bot/${dir}${i + 1}.png`;

                loading.push(this.loadImage(src).then(img => {
                    this.Img.botAnim[dir][i] = img;
                }));
            }
        }

        // NOTES
        this.Img.note = {};
        const notes = {
            "1n": "note.png",
            "2n": "halfnote.png",
            "4n": "quarternote.png",
            "8n": "eightnote.png",
            "1n.": "note.png",
            "2n.": "halfnote.png",
            "4n.": "quarternote.png",
            "8n.": "eightnote.png"
        };

        for (const key in notes) {
            const src = `../img/${notes[key]}`;

            loading.push(this.loadImage(src).then(img => {
                this.Img.note[key] = img;
            }));
        }

        // PICKUP
        loading.push(this.loadImage("../img/tileset/blocks_101.png").then(img => {
            this.Img.pickup = img;
        }));

        // FOG
        loading.push(this.loadImage("../img/fog.png").then(img => {
            this.Img.fog = img;
        }));

        //Wait for all to load:
        await Promise.all(loading);

        return this.Img;
    }
}

export class Sounds{
    static 
}