// import { Graphics } from './graphics.js';
// import { Socket } from './clientSocket.js'
// import { Sounds } from './sounds.js';
// import { GameUI } from './gameButtons.js';
// import { SoundAssets } from './Assets.js';

// let selfId = null;

// // export class Entity{
// //     static list = {};

// //     constructor(id, initPack){
// //         if(!selfId) selfId = Socket.selfId;

// //         this.x = initPack.x;
// //         this.y = initPack.y;
// //         this.id = id;

// //         Entity.list[this.id] = this;
// //     }

// //     update(pack){
// //         this.x = pack.x
// //         this.y = pack.y
// //     }

// //     destroy(){
// //         delete Entity.list[this.id];
// //     }

// //     static getDistanceSq(id){
// //         if(!selfId) return 9999;
// //         //returns distance squared between client's player and entity with given ID
// //         // console.log(`get distancesq id=${id}`)
// //         const entity = Entity.list[id];
// //         if(entity === undefined) return 9999;

// //         // console.log(entity.x)
// //         const dx = entity.x - Player.list[selfId].x;
// //         const dy = entity.y - Player.list[selfId].y 
// //         const distSq = dx*dx + dy*dy;

// //         // console.log(`dist sq ${distSq}`)
// //         return distSq;
// //     }

// //     getPos(){
// //         return {
// //             x: this.x,
// //             y: this.y
// //         }
// //     }

// //     requestSoundSlot(priority){
// //         if(!this.sound) return;
// //         if(this.hasSoundSlot) return;

// //         this.soundSlot = SoundPool.globalSoundPool.getFree(this.id, priority);
// //         if (this.soundSlot) {
// //             this.hasSoundSlot = true;
// //             this.soundSlot.occupierId = this.id;
// //             this.pan3D = this.soundSlot.pan3D;
// //             this.sampler = this.soundSlot.sampler;

// //             this.sampler.setSound(this.sound);
// //             return true;
// //         }
// //         else return false;
// //     }

// //     freeSoundSlot(){
// //         if (!this.hasSoundSlot) return;

// //         this.soundSlot.free = true;
// //         this.soundSlot.occupierId = null;
// //     }
// // }

// // export class Player extends Entity{
// //     static list = {};

// //     static stepSoundTimeoutMS = 250;

// //     constructor(id, initPack){
// //         super(id, initPack);
// //         this.name = initPack.name;
// //         this.hp = initPack.hp;
// //         this.score = initPack.score;
// //         this.isShooting = initPack.isShooting;
// //         this.selectedDuration = initPack.duration;
// //         this.weaponType = initPack.weaponType;
// //         this.selectedNoteID = initPack.selectedNoteID;
// //         this.selectedSound = initPack.selectedSound;

// //         this.footstepScheduler = null;

// //         if (this.id == Socket.selfId) {
// //             GameUI.setHPLabel(this.hp);
// //             GameUI.setScoreLabel(this.score);
// //         }
// //         this.synthTimeout = false;

// //         this.direction = this.updateDirection(initPack.direction);
// //         this.idleAnimFrame = 2;
// //         this.imageAnim = Graphics.Img.playerAnim;
// //         this.image = this.imageAnim[this.direction][this.idleAnimFrame];
// //         this.animFrame = 1 * 2;
// //         this.hueRot = Math.round(360 * Math.random())

// //         this.justDamaged = false;

// //         if(!SoundPool.globalSoundPool){
// //             SoundPool.globalSoundPool = new SoundPool(MAX_BULLET_SOUNDS);
// //         }

// //         this.sound = "steps";
// //         this.stepSoundTimeout = false;
// //         this.hasSoundSlot = false;
// //         this.requestSoundSlot(5);

// //         Player.list[this.id] = this;
// //     }

// //     update(pack){
// //         if (Player.list[selfId] == undefined) return;
// //         // console.log('player update', pack)
// //         if(pack.hp != undefined){
// //             if (pack.hp < this.hp) {
// //                 this.justDamaged = true;

// //                 setTimeout(() => {
// //                     this.justDamaged = false;
// //                 }, 300);
// //             }

// //             this.hp = pack.hp;

// //             if (this.id == Socket.selfId) {
// //                 GameUI.setHPLabel(this.hp);
// //             }
// //         }
        
// //         if(pack.score){
// //             this.score = pack.score;

// //             if (this.id == Socket.selfId) {
// //                 GameUI.setScoreLabel(this.score);
// //             }
// //         }

// //         if (pack.duration) {
// //             if (this.selectedDuration != pack.duration) {
// //                 this.selectedDuration = pack.duration;
// //                 if (this.scheduler) {
// //                     this.scheduler.remove();
// //                     this.scheduler = null;
// //                 }

// //                 if (this.id == selfId) {
// //                     GameUI.setDurationLabel(pack.duration);
// //                 }
// //             }
// //         }

// //         if (pack.selectedSound) {
// //             if (this.selectedSound != pack.selectedSound) {
// //                 this.selectedSound = pack.selectedSound;
// //                 if (this.scheduler) {
// //                     this.scheduler.remove();
// //                     this.scheduler = null;
// //                 }

// //                 if (this.id == selfId) {
// //                     GameUI.setSoundLabel(pack.selectedSound);
// //                 }
// //             }
// //         }

// //         if (pack.weaponType) {
// //             if(this.weaponType != pack.weaponType){
// //                 this.weaponType = pack.weaponType;
// //                 if (this.scheduler) {
// //                     this.scheduler.remove();
// //                     this.scheduler = null;
// //                 }
// //                 if (this.id == selfId) {
// //                     GameUI.setWeaponType(pack.weaponType);
// //                 }
// //             }
// //         }

// //         if (pack.selectedNoteID != undefined) {
// //             if(this.selectedNoteID != pack.selectedNoteID){
// //                 this.selectedNoteID = pack.selectedNoteID;
// //                 if (this.scheduler) {
// //                     this.scheduler.remove();
// //                     this.scheduler = null;
// //                 }
// //             }
// //         }

// //         if(pack.isShooting != undefined){
// //             this.isShooting = pack.isShooting;
// //         }

// //         if (this.isShooting && !this.scheduler) {
// //             this.scheduler = new BulletScheduler(
// //                 this,
// //                 this.selectedSound,
// //                 this.selectedDuration,
// //                 this.weaponType
// //             );
// //         } else if (!this.isShooting && this.scheduler) {
// //             this.scheduler.remove();
// //             this.scheduler = null;
// //         }

// //         if(pack.direction != undefined){
// //             this.direction = this.updateDirection(pack.direction);
// //         }

// //         if(pack.x && pack.y){
// //             if (this.x !== pack.x || this.y !== pack.y) {
// //                 //is walking:
// //                 if (this.id == selfId) {
// //                     Graphics.updateFog(pack.x - this.x, pack.y - this.y);
// //                 }

// //                 super.update(pack);

// //                 this.lastMovedTime = Date.now();
// //                 this.animFrame += 1;

// //                 //walking sounds for characters:
// //                 if (this.footstepScheduler == null)
// //                     this.footstepScheduler = new BulletScheduler(
// //                         this,
// //                         "steps",
// //                         "8n",
// //                         "normal"
// //                     );
// //                 if (this.isWalkingTimeout) clearTimeout(this.isWalkingTimeout);
// //                 this.isWalkingTimeout = setTimeout(() => {
// //                     if (this.footstepScheduler) this.footstepScheduler.remove();
// //                     this.footstepScheduler = null;
// //                 }, 100);

// //             } else {
// //                 // //not walking:

// //             }
// //         }
// //     }

// //     destroy(){
// //         // this.bulletSounds.disposeAll();
// //         if (this.hasSoundSlot) {
// //             this.sampler.stop();
// //             this.soundSlot.free = true;
// //         }

// //         console.log('destroying player');

// //         if(this.scheduler){
// //             this.scheduler.remove();
// //         }
// //     }

// //     draw(){
// //         if (!Player.list[selfId]) return;
// //         let x = this.x - Player.list[selfId].x + Graphics.gameWidth/2;
// //         let y = this.y - Player.list[selfId].y + Graphics.gameHeight/2;

// //         //set a static frame if player has not moved in some short time:
// //         if(Date.now() - this.lastMovedTime > 50){
// //             this.animFrame = this.idleAnimFrame;
// //         }

// //         //player image:
// //         Graphics.drawBuffer.push({
// //             type: "image",
// //             img: this.image,
// //             x: x - 32,
// //             y: y - 32,
// //             sortY: y + 32,
// //             w: 64,
// //             h: 64,
// //             hueRot: this.hueRot,
// //         });
// //         this.image = this.imageAnim[this.direction][parseInt(this.animFrame/2%3)]

// //         //player nametag:
// //         let nameFont = ''
// //         if(this.id == selfId) nameFont = 'bold 20px Cascadia Mono'
// //         else nameFont = '16px Cascadia Mono'
// //         Graphics.drawBuffer.push({
// //             type: 'text',
// //             text: this.name,
// //             x: x,
// //             y: y-36,
// //             sortY: y+32,
// //             font: nameFont,
// //         })

// //         //player hp bar:
// //         if(this.id != selfId || true){
// //             Graphics.drawBuffer.push({
// //                 type: 'hpbar',
// //                 hp: this.hp,
// //                 x: x,
// //                 y: y,
// //                 sortY: y-32,
// //             })
// //         }

// //         if(this.justDamaged){
// //             Graphics.drawBuffer.push({
// //                 type: "text",
// //                 text: "HIT!",
// //                 x: x,
// //                 y: y - 66,
// //                 sortY: y + 32,
// //                 font: nameFont,
// //                 color: "red"
// //             });
// //         }
// //     }

// //     updateDirection(direction){
// //         let angle = Math.round(direction)
// //         // console.log(angle);

// //         switch(angle){
// //             case 0:
// //                 return 'e';
// //             case 180:
// //                 return 'w';
// //             case 90:
// //                 return 's';
// //             case -90:
// //                 return 'n';
// //             case 45:
// //                 return 'se';
// //             case -45:
// //                 return 'ne';
// //             case 135:
// //                 return 'sw';
// //             case -135:
// //                 return 'nw';
// //         }

// //         return 's';
// //     }
// // }

// // export class Bot extends Player{
// //     constructor(initPack){
// //         super(initPack);
        
// //         this.idleAnimFrame = 1;
// //         this.imageAnim = Graphics.Img.botAnim;
// //         // this.image = Img.botAnim[this.direction][this.idleAnimFrame];

// //         console.log('bot created')

// //         return this;
// //     }
// // }

// // //TODO: change the sound names on server side!!!
// // const soundNames = {
// //     Synth: "piano",
// //     DuoSynth: "guitar",
// //     AMSynth: "clarinet",
// //     FMSynth: "flute",
// //     MembraneSynth: "harp",
// //     MetalSynth: "organ",
// //     MonoSynth: "trumpet",
// //     PolySynth: "violin",
// //     steps: "steps",
// //     pickup: "pickup"
// // };

// // export class BulletScheduler{

// //     constructor(parent, sound, duration, weaponType){
// //         this.parentID = parent.id;
// //         // const duration = parent.selectedDuration;

// //         this.soundSlot = null;
// //         this.hasSoundSlot = false;

// //         this.shootCount = 0;

// //         let startOn;
// //         switch(duration){
// //             case "1n.":
// //                 startOn = "1:2:0";
// //                 break;
// //             case "1n":
// //                 startOn = "1:0:0";
// //                 break;
// //             case "2n.":
// //                 startOn = "0:3:0";
// //                 break;
// //             case "2n":
// //                 startOn = "0:2:0";
// //                 break;
// //             case "4n.":
// //                 startOn = "0:1:2";
// //                 break;
// //             case "4n":
// //                 startOn = "0:1:0";
// //                 break;
// //             case "8n.":
// //                 startOn = "0:0:3";
// //                 break;
// //             case "8n":
// //                 startOn = "0:0:2";
// //                 break;
// //             default:
// //                 console.warn('unknown duration', duration);
// //                 return;
// //         }
        

// //         const noteID = parent.selectedNoteID;
// //         const note = Sounds.allowedNotes[noteID];
// //         const [note2ID, octUp2] = Sounds.getTransposedAllowedNoteID(noteID, 4);
// //         const [note3ID, octUp3] = Sounds.getTransposedAllowedNoteID(noteID, 7);
// //         //TODO use octUp!

// //         const note2 = Sounds.allowedNotes[note2ID];
// //         const note3 = Sounds.allowedNotes[note3ID];

// //         switch(weaponType){
// //             case "normal":
// //                 this.ID = Tone.Transport.scheduleRepeat(
// //                     (time) => {
// //                         new GhostBullet(parent, note, sound, duration);
// //                     },
// //                     duration,
// //                     startOn
// //                 );
// //                 break;
// //             case "chord":                
// //                 // console.log(
// //                 //     'note1',
// //                 //     note,
// //                 //     'note2',
// //                 //     note2,
// //                 //     'note3',
// //                 //     note3
// //                 // )
// //                 this.ID = Tone.Transport.scheduleRepeat(
// //                     (time) => {
// //                         //triad chord from 3 notes:
// //                         new GhostBullet(parent, note, sound, duration);
// //                         new GhostBullet(parent, note2, sound, duration);
// //                         new GhostBullet(parent, note3, sound, duration);
// //                     },
// //                     duration,
// //                     startOn
// //                 );
// //                 break;
// //             case "arp-up":
// //                 this.ID = Tone.Transport.scheduleRepeat(                    
// //                     (time) => {
// //                         let notesIDs = [noteID, note2ID, note3ID];
// //                         let arpNoteID = notesIDs[this.shootCount % notesIDs.length];
// //                         let arpNote = Sounds.allowedNotes[arpNoteID];
// //                         // console.log('asc arp note', arpNote)

// //                         //triad chord from 3 notes:
// //                         new GhostBullet(parent, arpNote, sound, duration);

// //                         this.shootCount++;
// //                     },
// //                     duration,
// //                     startOn
// //                 );
// //                 break;
// //             case "arp-down":
// //                 this.ID = Tone.Transport.scheduleRepeat(
// //                     (time) => {
// //                         let notesIDs = [noteID, note2ID, note3ID];
// //                         let arpNoteID =
// //                             notesIDs[
// //                                 notesIDs.length -
// //                                     1 -
// //                                     (this.shootCount % notesIDs.length)
// //                             ];
// //                         let arpNote = Sounds.allowedNotes[arpNoteID];
// //                         // console.log("desc arp note", arpNote);

// //                         //triad chord from 3 notes:
// //                         new GhostBullet(parent, arpNote, sound, duration);

// //                         this.shootCount++;
// //                     },
// //                     duration,
// //                     startOn
// //                 );
// //                 break;
// //             case "arp-alt":
// //                 this.ID = Tone.Transport.scheduleRepeat(
// //                     (time) => {
// //                         let notesIDs = [noteID, note2ID, note3ID];

// //                         let cycleLen = 2 * (notesIDs.length - 1);
// //                         let cyclePos = this.shootCount % cycleLen;

// //                         let index;
// //                         if (cyclePos < notesIDs.length) index = cyclePos;
// //                         else index = cycleLen - cyclePos;

// //                         let arpNoteID =
// //                             notesIDs[index];
// //                         let arpNote = Sounds.allowedNotes[arpNoteID];
// //                         // console.log("alt arp note", arpNote);

// //                         //triad chord from 3 notes:
// //                         new GhostBullet(parent, arpNote, sound, duration);

// //                         this.shootCount++;
// //                     },
// //                     duration,
// //                     startOn
// //                 );
// //                 break;
// //             default:
// //                 console.warn("weapon type not supported for ghost bullet scheduling!");
// //         }

// //         //weaponType: "normal":
        

// //         //weaponType: "chord" (triad chord):

// //     }

// //     remove(){
// //         if(this.soundSlot){
// //             this.sampler.stop();
// //             this.soundSlot.free = true;
// //         }
// //         Tone.Transport.clear(this.ID);
// //     }
// // }

// // export class GhostBullet{
// //     //a bullet that is forecasted to appear, but has not been yet received from server-side:

// //     static listByID = {}

// //     constructor(parent, note, sound, duration){
// //         this.x = parent.x;
// //         this.y = parent.y;

// //         if(parent.direction.includes('w')) this.x -=20;
// //         if (parent.direction.includes("e")) this.x += 20;
// //         if (parent.direction.includes("n")) this.y -= 20;
// //         if (parent.direction.includes("s")) this.y += 20;

// //         this.creationTimestamp = Date.now();

// //         this.received = false;

// //         this.soundSlot = null;
// //         this.hasSoundSlot = false;

// //         this.soundSlot = SoundPool.globalSoundPool.getFree(
// //             parent.id,
// //             10
// //         );


// //         if (this.soundSlot) {
// //             this.hasSoundSlot = true;
// //             this.soundSlot.sampler.samplePlayer.fadeIn = 0.01;
// //             this.soundSlot.occupierId = parent.id;

// //             this.pan3D = this.soundSlot.pan3D;
// //             this.pan3D.setPosition(
// //                 (this.x - Player.list[selfId].x) * 0.1,
// //                 0,
// //                 (this.y - Player.list[selfId].y) * 0.1
// //             );

// //             this.sampler = this.soundSlot.sampler;
// //             this.sampler.setSound(sound);

// //             // const note = Sounds.allowedNotes[parent.selectedNoteID];
// //             this.sampler.play(note);
// //             // Sounds.test.triggerAttackRelease("C5", "32n");

// //             setTimeout(() => {
// //                 delete GhostBullet.listByID[parent.id + note];
// //                 if(this.received) return;
// //                 this.sampler.stop();
// //                 this.soundSlot.free = true;
// //             }, 250);

// //             GhostBullet.listByID[parent.id + note] = this;
// //         }

        
// //     }
// // }

// // export class Bullet extends Entity{
// //     static list = {};

// //     constructor(id, initPack){
// //         super(id, initPack);
// //         // console.log('bullet pack: ', initPack)
        
// //     this.note = initPack.note;
// //         this.duration = initPack.duration;
// //         this.parent = Player.list[initPack.parentId];
// //         this.sound = initPack.sound;
// //         this.duration = initPack.duration;
// //         this.timeQuantizePos;
// //         switch (this.duration) {
// //             case "1n.":
// //                 this.timeQuantizePos = "1:2:0";
// //                 break;
// //             case "1n":
// //                 this.timeQuantizePos = "1:0:0";
// //                 break;
// //             case "2n.":
// //                 this.timeQuantizePos = "0:3:0";
// //                 break;
// //             case "2n":
// //                 this.timeQuantizePos = "0:2:0";
// //                 break;
// //             case "4n.":
// //                 this.timeQuantizePos = "0:1:2";
// //                 break;
// //             case "4n":
// //                 this.timeQuantizePos = "0:1:0";
// //                 break;
// //             case "8n":
// //                 this.timeQuantizePos = "0:0:2";
// //                 break;
// //             default:
// //                 console.warn("unknown duration", duration);
// //             // this.sampler.setSound(this.sound);
// //         }
// //         this.hasSoundSlot = false;

// //         //find parent's ghost bullets:
// //         let ghostBullet = null;
// //         if(this.parent) ghostBullet = GhostBullet.listByID[this.parent.id + this.note];
// //         if(ghostBullet != null){
// //             console.log('found ghost bullet', ghostBullet, 'from ', Date.now() - ghostBullet.creationTimestamp, 'ms ago')
// //             ghostBullet.received = true;
// //             this.soundSlot = ghostBullet.soundSlot
// //             delete GhostBullet.listByID[this.parent.id + this.note];
// //         }else{
// //             console.log('did not found ghost bullet');
// //         }
// //         // else{
// //         //     // this.soundSlot = SoundPool.globalSoundPool.getFree(this.id);
// //         //     console.warn('no ghost bullet found', Tone.Transport.position)
// //         //     Tone.Transport.scheduleOnce(() => {
// //         //         this.soundSlot = SoundPool.globalSoundPool.getFree(this.id);

// //         //         if (this.soundSlot) {
// //         //             console.log("bullet has soundslot");

// //         //             this.hasSoundSlot = true;
// //         //             this.soundSlot.occupierId = this.id;
// //         //             this.pan3D = this.soundSlot.pan3D;
// //         //             this.pan3D.setPosition(
// //         //                 (this.x - Player.list[selfId].x) * 0.1,
// //         //                 (this.y - Player.list[selfId].y) * 0.1,
// //         //                 0
// //         //             );
// //         //             this.sampler = this.soundSlot.sampler;
// //         //             this.sampler.play("C");

// //         //             Tone.Transport.scheduleOnce(() => {
// //         //                 this.sampler.stop();
// //         //                 this.soundSlot.free = true;
// //         //                 this.soundSlot = null;
// //         //             }, this.timeQuantizePos);
// //         //         }
// //         //     }, this.timeQuantizePos);
// //         // }

// //         // this.soundSlot = SoundPool.globalSoundPool.getFree(this.id);
// //         if(this.soundSlot){
// //             console.log('bullet has soundslot')
// //             this.hasSoundSlot = true;
// //             this.soundSlot.occupierId = this.id;
// //             this.pan3D = this.soundSlot.pan3D;
// //             this.pan3D.setPosition(
// //                 (this.x - Player.list[selfId].x) * 0.1,
// //                 0,
// //                 (this.y - Player.list[selfId].y) * 0.1
// //             );
// //             this.sampler = this.soundSlot.sampler;

// //             Tone.Transport.scheduleOnce(() => {
// //                 this.sampler.stop();
// //                 this.soundSlot.free = true;
// //                 this.soundSlot = null;
// //             }, this.timeQuantizePos);

// //         }

        
// //         this.imgWidth = 32;
// //         this.imgHeight = 32;
// //         this.labelSize = 30;
// //         this.shrinkFactor = 1000/Sounds.toneDurationToMs(this.duration);
// //         this.shrinkInterval = setInterval(()=>{
// //             this.imgWidth -= this.shrinkFactor;
// //             this.imgHeight -= this.shrinkFactor;
// //             this.labelSize -= this.shrinkFactor;
// //         }, 100)
        
// //         //For highlighting duration timeout:
// //         if (initPack.parentId == selfId) {
// //             //client's bullet
// //             GameUI.startDurationTimeoutHighlight(this.duration);
// //         }

// //         // let synthClass = Tone[initPack.sound];

// //         //get a free synth from synth pool:
// //         // this.synthPoolSlot = SynthPool.getFreeSynthSlot(initPack.sound);
// //         // this.synth = this.synthPoolSlot.synth;

// //         // this.noteShift = Sounds.notes.indexOf(this.note)
// //         // this.pitchShift = new Tone.PitchShift(this.noteShift)

// //         // this.synth = new Tone[initPack.sound];
// //         // console.log(this.synth)
// //         // this.pan3d.setPosition(
// //         //     (this.x - Player.list[selfId].x)*0.1,
// //         //     (this.y - Player.list[selfId].y)*0.1,
// //         //     0
// //         // )
// //         // this.synth.connect(this.pitchShift);
// //         // this.pitchShift.connect(this.pan3d)


// //         Bullet.list[this.id] = this;



// //         if(Tone.context.state == "running" && Sounds.audioOn && this.hasSoundSlot){
// //             // this.synth.triggerAttack(`${this.note}4`);
// //             // this.synth.start();
// //             // this.sampler.play(this.note);
// //         }
// //     }

// //     update(pack){
// //         super.update(pack);
// //         if(Player.list[selfId] && this.hasSoundSlot){
// //             this.pan3D.setPosition(
// //                 (this.x - Player.list[selfId].x) * 0.1,
// //                 0,
// //                 (this.y - Player.list[selfId].y) * 0.1
// //             );
// //         }

// //         if(!this.hasSoundSlot){
// //             if(this.requestSoundSlot(8)){
// //                 this.sampler.samplePlayer.fadeIn = 0.5;
// //                 this.sampler.play(this.note);
// //             }

// //         }
// //     }

// //     destroy(){
// //         if(this.hasSoundSlot){
// //             this.sampler.stop();
// //             this.soundSlot.free = true;
// //         }
// //         // this.synth.triggerRelease();
// //         // this.synth.stop();
// //         // this.synth.disconnect();
// //         // this.synthPoolSlot.busy = false;
// //         // this.pan3d.dispose();
// //         // this.pitchShift.dispose();
// //         // if(Tone.context.state == "running" && Sounds.audioOn){
// //         //     this.synth.triggerAttack(`${this.note}4`);
// //         // }

// //         // this.synthPoolSlot.busy = false;
        
        
// //         setTimeout(()=>{
// //             // this.synth.triggerRelease();
            
            
// //             super.destroy();
// //             delete Bullet.list[this.id]
// //         }, 50);
// //     }

// //     draw(){
// //         let x = this.x - Player.list[selfId].x + Graphics.gameWidth/2;
// //         let y = this.y - Player.list[selfId].y + Graphics.gameHeight/2;

// //         Graphics.drawBuffer.push({
// //             type: "image",
// //             img: Graphics.Img.note[this.duration],
// //             x: x - this.imgWidth / 2,
// //             y: y - this.imgHeight / 2,
// //             sortY: y + 16,
// //             w: this.imgWidth,
// //             h: this.imgHeight,
// //         });

// //         Graphics.drawBuffer.push({
// //             type: 'text',
// //             text: this.note,
// //             x: x-8,
// //             y: y-16,
// //             sortY: y+16,
// //             font: `${this.labelSize}px Cascadia Mono`,
// //         })
// //     }
// // }

// // export class Pickup extends Entity{
// //     static list = {}

// //     constructor(id, initPack){
// //         super(id, initPack);
// //         this.sound = "pickup";
// //         this.isPicked = false;
// //         this.hasSoundSlot = false;

// //         this.imgWidth = this.imgHeight = 16;
// //         this.animDir = 1;

// //         Pickup.list[this.id] = this;
// //     }

// //     destroy(){
// //         this.isPicked = true;
// //         if (!this.hasSoundSlot) {
// //             this.requestSoundSlot(1);
// //         }

// //         if (this.hasSoundSlot) {
// //             this.pan3D.positionX.value =
// //                 (this.x - Player.list[selfId].x) * 0.05;
// //             this.pan3D.positionZ.value =
// //                 (this.y - Player.list[selfId].y) * 0.05;

// //             // this.pan3D.setPosition(
// //             //     (this.x - Player.list[selfId].x) * 0.05,
// //             //     (this.y - Player.list[selfId].y) * 0.05,
// //             //     0
// //             // );

// //             const randNote =
// //                 Sounds.allowedNotes[
// //                     Math.floor(Math.random() * Sounds.allowedNotes.length)
// //                 ];
// //             this.sampler.play(randNote);

// //             setTimeout(() => {
// //                 this.soundSlot.free = true;
// //                 super.destroy();
// //                 delete Pickup.list[this.id];
// //             }, 500);
// //         }
// //     }

// //     draw(){
// //         if (!Player.list[selfId]) return;
// //         if(this.isPicked) return;
// //         let x = this.x - Player.list[selfId].x + Graphics.gameWidth/2;
// //         let y = this.y - Player.list[selfId].y + Graphics.gameHeight/2;

// //         Graphics.drawBuffer.push({
// //             type: "image",
// //             img: Graphics.Img.pickup,
// //             x: x - this.imgWidth / 2,
// //             y: y - this.imgHeight / 2 + 8,
// //             sortY: y + 16,
// //             w: this.imgWidth,
// //             h: this.imgHeight,
// //         });

// //         if(this.imgWidth > 20){
// //             this.animDir = -1;
// //         }
// //         if(this.imgWidth < 14){
// //             this.animDir = 1;
// //         }

        
// //         this.imgWidth = this.imgHeight += (this.animDir * Math.random()*0.2);
// //     }
// // }


// // export class StaticTileLayers{
// //     //TODO add time based rebuilding (some layers have fewer tiles than buffer limit + prevent building if last rebuild was not long ago)
// //     //TODO all floor & below layers could be rendered at once!!

// //     static canvases = {};

// //     static tileBuffers = {};

// //     static addToBuffer(tile){
// //         const layerID = tile.layerId;

// //         if (!this.tileBuffers[layerID]) {
// //             this.tileBuffers[layerID] = [];
            
// //             setInterval(()=>{
// //                 if (
// //                     this.tileBuffers[layerID] &&
// //                     this.tileBuffers[layerID].length == 0
// //                 ) return;

// //                 this.build(layerID, Object.values(Tile.list));
// //             }, 2000);
// //         }
        
// //         this.tileBuffers[layerID].push(tile);

// //         if (this.tileBuffers[layerID].length > 120) {
// //             console.log('build!')
// //             this.build(layerID, Object.values(Tile.list));
// //         }

// //         // console.log(this.tileBuffers[layerID]);

// //         // console.log(
// //         //     "layerID",
// //         //     layerID,
// //         //     "bufferLen",
// //         //     this.tileBuffers[layerID].length,
// //         //     "buffer",
// //         //     this.tileBuffers[layerID]
// //         // );
// //     }

// //     static build(layerID, tiles){
// //         // if (!tileImages) return;
// //         if (
// //             this.canvases[layerID] &&
// //             this.canvases[layerID].hasOwnProperty("timeStamp") &&
// //             Date.now() - this.canvases[layerID].timeStamp < 1000
// //         ) return;
// //         // if(Date.now() - this.canvases[layerID].timeStamp < 1000) return;

// //         this.tileBuffers[layerID] = [];

// //         const minX = Math.min(...tiles.map((t) => t.x));
// //         const minY = Math.min(...tiles.map((t) => t.y));
// //         const maxX = Math.max(...tiles.map((t) => t.x));
// //         const maxY = Math.max(...tiles.map((t) => t.y));

// //         const width = (maxX - minX + 64) * 0.5;
// //         const height = (maxY - minY + 64) * 0.5;

// //         const buffer = new OffscreenCanvas(width, height);
// //         const bctx = buffer.getContext("2d");
// //         bctx.scale(0.5, 0.5);
// //         //SCALE 0.1 also in graphics.js:301&:302

// //         let yBuffer = [];
// //         for (const t of tiles) {
// //             if (t.layerId !== layerID) continue;
// //             yBuffer.push(t);
// //         }

// //         yBuffer.sort((a, b) => {
// //             let aY = a.y;
// //             let bY = b.y;

// //             return aY - bY - 0.01;
// //         });

// //         for(const t of yBuffer){
// //             const img = Tile.tileImages[t.gid];
// //             if (!img) {
// //                 //image tile not loaded yet:
// //                 Tile.loadImg(t.gid);
// //                 continue;
// //             }
// //             bctx.drawImage(img, t.x - minX, t.y - minY, 64, 64);
// //         }

// //         const timeStamp = Date.now();
// //         this.canvases[layerID] = { buffer, minX, minY, width, height, timeStamp };
// //         // console.log('built layer canvas')
// //     }
// // }

// // export class Tile{
// //     static list = {};

// //     static mapData;
// //     static tileImages = {};
// //     static currentLoadingGIDs = {}

// //     static loadMapData(){
// //         fetch("../map6.json")
// //             .then(res=>res.json())
// //             .then(async data=>{
// //                 Tile.mapData = data;
// //             });
// //     }

// //     static async loadImg(gid){
// //         if(!Tile.mapData) return;
// //         if(Tile.currentLoadingGIDs[gid]) return;
// //         Tile.currentLoadingGIDs[gid] = true;

// //         const tileset = Tile.mapData.tilesets[0];
// //         const id = gid - tileset.firstgid;
// //         const tile = tileset.tiles.find(t => t.id === id);

// //         const img = new Image();
// //         img.src = `../${tile.image}`;
// //         await new Promise(res => (img.onload = res));
// //         Tile.tileImages[gid] = img;
// //     }

// //     constructor(id, initPack){
// //         this.id = id;
// //         this.x = initPack.x;
// //         this.y = initPack.y;
// //         this.gid = initPack.gid;
// //         this.layerId = initPack.layerId;
// //         // console.log('layerid', this.layerId)
// //         if(this.layerId <= 0){
// //             StaticTileLayers.addToBuffer(this);
// //             // buildStaticLayer(this.layerId, Object.values(Tile.list));
// //         }

// //         Tile.list[this.id] = this;
// //     }

// //     draw(){
// //         // if(!tileImages) return;
// //         const img = Tile.tileImages[this.gid];
// //         if(!img){
// //             //image tile not loaded yet:
// //             Tile.loadImg(this.gid);
// //             return;
// //         }

// //         if(this.layerId <= 0 ) return;
// //         let x = this.x - Player.list[selfId].x + Graphics.gameWidth/2;
// //         let y = this.y - Player.list[selfId].y + Graphics.gameHeight/2;
// //         // const img = tileImages[this.gid];

// //         let shiftSortY;
// //         if(this.layerId>0){
// //             shiftSortY = 48 + 33 * (this.layerId-1);
// //         }
// //         else{
// //             shiftSortY = 64 * this.layerId;
// //         }

// //         if(!img) console.error('no img', this.gid)
// //         // else console.log(this.gid)

// //         Graphics.drawBuffer.push({
// //             type: 'image',
// //             img: img,
// //             x: x,
// //             y: y,
// //             sortY: y+shiftSortY,
// //             layerId: this.layerId,
// //             w: 64,
// //             h: 64
// //         })
// //     }

// //     destroy(){
// //         // super.destroy();
// //         delete Tile.list[this.id];
// //     }
// // }

// // const MAX_BULLET_SOUNDS = 8;
// // class SoundPool{
// //     static globalSoundPool;

// //     constructor(soundNum){
// //         this.pool = []

// //         for(let i = 0; i < soundNum; i++){
// //             this.pool.push(new SoundSlot())
// //         }
// //     }

// //     getFree(forID, priority){
// //         const freeSlot = this.pool.find(slot => slot.free);

// //         if(freeSlot){
// //             freeSlot.free = false;
// //             freeSlot.occupierPriority = priority;
// //             return freeSlot;
// //         }
// //         else{
// //             console.log(`sound pool no free slots left`)
// //             //if sound slot is demanded by an entity further than current sound slot occupiers, it won't be given:
// //             const demandingEntityDistSq = Entity.getDistanceSq(forID) / priority;

// //             //find a slot occupied by the furthest entity:
// //             let maxDistSq = demandingEntityDistSq;
// //             let furthestSlot = undefined;
// //             for(let slot of this.pool){
// //                 const occupierDistSq = Entity.getDistanceSq(slot.occupierId);
// //                 // console.log(demandingEntityDistSq, occupierDistSq)

// //                 if(occupierDistSq>maxDistSq){
// //                     maxDistSq = occupierDistSq;
// //                     furthestSlot = slot;
// //                 }
// //             }
// //             //if no occupier were further, we deny the demander the slot;
// //             if(!furthestSlot){
// //                 return null;
// //             }

// //             //occupier which was further is deprived of the sound slot:
// //             furthestSlot.sampler.stop();
// //             furthestSlot.occupierId = forID;
// //             Entity.list[furthestSlot.occupierId].hasSoundSlot = false;
// //             return furthestSlot;
// //         }
// //     }

// //     disposeAll(){
// //         for(let slot of this.pool){
// //             slot.pan3D.dispose();
// //             slot.sampler.dispose();
// //             free = false;
// //         }
// //     }
// // }

// // class SoundSlot{
// //     constructor(){
// //         this.sampler = new Sampler("../audio/piano.wav");
// //         this.pan3D = new Tone.Panner3D({
// //             rollofFactor: 0.01,
// //             distanceModel: "exponential",
// //             panningModel: "equalpower",
// //         });
// //         // this.pan3D.rollofFactor = 0.01;
// //         // this.pan3D.panningModel = "HRTF";
// //         // this.distanceModel = "linear";
// //         this.sampler.samplePlayer.connect(this.pan3D);
// //         this.pan3D.connect(Sounds.limiter);

// //         this.free = true;
// //         this.occupierId = null;
// //         this.occupierPriority = 0;
// //     }
    
// // }


// // class Sampler{
// //     constructor(sampleSrc){
// //         this.samplePlayer = new Tone.Player();
// //         this.samplePlayer.fadeIn = 0.01;
// //         this.samplePlayer.fadeOut = 0.01;
// //         // this.samplePlayer = new Tone.Synth();
// //         this.samplePlayer.playbackRate = 1;
// //         // this.pitchShift = new Tone.PitchShift();

// //         // this.samplePlayer.connect(this.pitchShift);
// //     }

// //     setSound(sound){
// //         this.samplePlayer._buffer = SoundAssets.buffers[soundNames[sound]];
// //     }

// //     play(note){
// //         if(Tone.context.state != "running") return;
// //         let shift = Sounds.notes.indexOf(note);
// //         const scaleBaseIndex = Sounds.notes.indexOf(Sounds.scaleBase);

// //         if(shift >= scaleBaseIndex) shift -= 12;

// //         // console.log(note, shift)

// //         this.samplePlayer.stop();
// //         this.samplePlayer.playbackRate = Math.pow(2, shift / 12);
// //         // this.pitchShift.pitch = shift;
// //         this.samplePlayer.start();

// //         // this.samplePlayer.triggerAttackRelease(note+"5", "32n");
// //     }

// //     stop(){
// //         //TODO error if sampler is not playing:
// //         this.samplePlayer.stop();
// //     }

// //     dispose(){
// //         this.samplePlayer.dispose();
// //         // this.pitchShift.dispose();
// //     }
// // }

