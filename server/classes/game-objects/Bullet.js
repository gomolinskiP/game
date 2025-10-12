import { Entity } from "./Entity.js";
import { Player } from "./Player.js";
import { Sounds } from "../musical/Sounds.js";
import { Character } from "./Character.js";
import { Tile } from "./Tile.js";
import Quadtree from "@timohausmann/quadtree-js";

// export class ScheduledBullet {
//   static list = {};
//   static quadtree;

//   static createQuadtree(rect){
//     ScheduledBullet.quadtree = new Quadtree(rect);
//   }

//   static refreshQuadtree(){
//     ScheduledBullet.quadtree.clear();

//     for (let id in ScheduledBullet.list) {
//       const scheduledBullet = ScheduledBullet.list[id];
//       ScheduledBullet.quadtree.insert({
//         x: scheduledBullet.x - 8,
//         y: scheduledBullet.y - 8,
//         width: 16,
//         height: 16,
//         id: id,
//       });
//     }
//   }

//   constructor(parent, note = "onSpawn", durationType, damage) {
//     this.id = Math.random();
//     this.parent = parent;
//     this.x = parent.x;
//     this.y = parent.y;

//     this.sound = parent.weapon.sound;
//     this.duration = parent.weapon.duration;
//     this.durationType = durationType;
//     this.damage = damage;
//     this.note = note;

//     this.spawn();
//     // this.spawnInT = Sounds.getNoteSpawnTime(this.duration);

//     // this.timeInaccuracy = Sounds.evaluateNoteTimingAccuracy(this.duration, this.durationType);

//     // let timingMessageInfo = "";
//     // if(Math.abs(this.timeInaccuracy) < 20){
//     //   // inaccuracy within PERFECT timing
//     //   timingMessageInfo = 'Perfect timing!';
//     //   this.spawn();
//     // }
//     // else if(Math.abs(this.timeInaccuracy) < 150){
//     //   // inaccuracy to big to be perfect, but small enough to allow bullet spawn:
//     //   if(this.timeInaccuracy > 0){
//     //     // shot fired a bit to late:
//     //     timingMessageInfo = this.timeInaccuracy + ' ms to late!';
//     //     this.spawn();
//     //   }
//     //   else{
//     //     //shot fired a bit to early:
//     //     timingMessageInfo = -this.timeInaccuracy + ' ms to early!';
//     //     this.spawn();
//     //   }
//     // }
//     // else{
//     //   timingMessageInfo = 'Your timing is to inaccurate!'
//     //   this.cancel();
//     // }

//     //     if (this.parent.updatePack) {
//     //         this.parent.updatePack.push({
//     //             msg: timingMessageInfo,
//     //             type: "gameMsg",
//     //         });
//     //     }

    
//     // if(this.timeInaccuracy >= 0){
//     //   // player shot to late or perfectly timed

//     //   if(this.timeInaccuracy < 20){
//     //     timingMessageInfo = 'Perfect'
//     //   }

//     //   if(this.timeInaccuracy < 100){
//     //     this.spawn();

//     //   }
//     // }
//     // else{
//     //   // player shot to early


//     // }

//     // if (this.parent.updatePack) {
//     //     this.parent.updatePack.push({
//     //         msg: this.timeInaccuracy,
//     //         type: "gameMsg",
//     //     });
//     // }

//     // this.spawn();

//     // this.durationInMs = this.getTimeFromDuration(
//     //   this.duration,
//     //   this.durationType
//     // );
//     // this.maxTimeInaccuracy = Math.max(100, this.durationInMs / 10);

//     // console.log(this.spawnInT, this.duration, this.durationInMs);
//     // if (this.spawnInT > this.durationInMs - this.maxTimeInaccuracy) {
//     //     //player is late by no more than max innacuracy - spawn immediately
//     //     this.spawn();


//     //     setTimeout(() => {
//     //         this.parent.hasShotScheduled = false;
//     //     }, this.durationInMs - this.maxTimeInaccuracy);
//     // } else if (this.spawnInT > this.maxTimeInaccuracy) {
//     //   //player is too early;
//     //   this.cancel();
//     // } else {
//     //   //player early but within max inaccuracy:
//     //   setTimeout(() => {
//     //     this.spawn();
//     //   }, this.spawnInT);

//     //   setTimeout(() => {
//     //     this.parent.hasShotScheduled = false;
//     //   }, this.durationInMs - this.maxTimeInaccuracy);
//     // }

//     ScheduledBullet.list[this.id] = this;
//     return this;
//   }

//   updatePosition(x, y) {
//     this.x = x;
//     this.y = y;
//   }

//   cancel() {
//     // let message;
//     // if (this.spawnInT < this.durationInMs / 2) {
//     //   message = "To early!";
//     // } else {
//     //   message = "To late!";
//     // }

//     // if (this.parent.updatePack) {
//     //   this.parent.updatePack.push({
//     //     msg: message,
//     //     type: "gameMsg",
//     //   });
//     // }
//     setTimeout(() => {
//       this.parent.hasShotScheduled = false;
//     }, this.spawnInT);
//   }

//   spawn() {
//     new Bullet(
//       this.parent,
//       this.parent.lastAngle,
//       this.note,
//       this.durationType,
//       this.damage
//     );
//     this.destroy();
//   }

//   getSpawnTime() {
//     const creationTimeNs = process.hrtime.bigint() - Sounds.startT;
//     const lastTickT = (Sounds.tickNum - 1) * Sounds.beatInterval; //in ms
//     const timeDif = Number(creationTimeNs / BigInt(1e6)) - lastTickT;

//     let spawnInT;
//     switch (this.duration) {
//       case "1n":
//         spawnInT =
//           (4 - ((Sounds.tickNum - 1) % 4)) * Sounds.beatInterval - timeDif;
//         break;
//       case "2n":
//         spawnInT =
//           (2 - ((Sounds.tickNum - 1) % 2)) * Sounds.beatInterval - timeDif;
//         break;
//       case "4n":
//         spawnInT = Sounds.beatInterval - timeDif;
//         break;
//       case "8n":
//         if (timeDif > Sounds.beatInterval / 2) {
//           spawnInT = Sounds.beatInterval - timeDif;
//         } else {
//           spawnInT = Sounds.beatInterval / 2 - timeDif;
//         }
//         break;
//       case "1n.":
//         spawnInT =
//           (6 - ((Sounds.tickNum - 1) % 6)) * Sounds.beatInterval - timeDif;
//         break;
//       case "2n.":
//         spawnInT =
//           (3 - ((Sounds.tickNum - 1) % 3)) * Sounds.beatInterval - timeDif;
//         break;
//       case "4n.":
//         let quarterInCycle = (Sounds.tickNum - 1) % 3;
//         switch (quarterInCycle) {
//           case 0:
//             spawnInT = (3 * Sounds.beatInterval) / 2 - timeDif;
//             break;
//           case 1:
//             if (timeDif > Sounds.beatInterval / 2) {
//               spawnInT = 2 * Sounds.beatInterval - timeDif;
//             } else {
//               spawnInT = Sounds.beatInterval / 2 - timeDif;
//             }
//             break;
//           case 2:
//             spawnInT = Sounds.beatInterval - timeDif;
//             break;
//         }
//         break;
//     }
//     return spawnInT;
//   }

//   getTimeFromDuration(duration, durationType) {
//     let timeMs;

//     let durationInt = parseInt(duration.replace("n", "").replace(".", ""));
//     switch (durationType) {
//       case "normal":
//         timeMs = (60000 / 120) * (4 / durationInt);
//         break;
//       case "dotted":
//         timeMs = ((60000 / 120) * (4 / durationInt) * 3) / 2;
//         break;
//     }

//     return timeMs;
//   }

//   destroy() {
//     delete ScheduledBullet.list[this.id];
//   }
// }

export class Bullet extends Entity {
  static list = {};
  static quadtree;

  static createQuadtree(rect) {
    Bullet.quadtree = new Quadtree(rect);
  }

  static refreshQuadtree() {
    Bullet.quadtree.clear();

    for (let id in Bullet.list) {
      const bullet = Bullet.list[id];
      Bullet.quadtree.insert({
        x: bullet.x - 8,
        y: bullet.y - 8,
        width: 16,
        height: 16,
        id: id,
      });
    }
  }

  constructor(parent, angle, note, durationMs, damage) {
    super(parent.x, parent.y);
    this.id = Math.random();
    this.parent = parent;
    this.speed = 20;

    this.entityType = "bullet";

    angle = angle + 10 * (Math.random() - 0.5);

    this.spdX = Math.cos((angle / 180) * Math.PI) * this.speed;
    this.spdY = Math.sin((angle / 180) * Math.PI) * this.speed;

    this.note = note;
    this.sound = parent.weapon.sound;
    this.duration = parent.weapon.duration;
    this.durationMs = durationMs;
    this.damage = damage;

    // switch(note){
    //     case "onSpawn":
    //         this.note = parent.selectedNote;
    //         break;
    //     case //first character is "+":
    //         //do something
    //         break;
    //     default:
    //         this.note = note;
    //         break;
    // }

    //legacy:
    // if (note == "onSpawn") this.note = parent.selectedNote;
    // else if (note.startsWith("+")) {
    //   let transposedNote = Sounds.scale.getTransposed(
    //     parent.selectedNote,
    //     parseInt(note[1])
    //   );
    //   if (Sounds.scale.allowedNotes.includes(transposedNote))
    //     this.note = transposedNote; //major third
    //   else
    //     this.note = Sounds.scale.getTransposed(
    //       parent.selectedNote,
    //       parseInt(note[1] - 1)
    //     ); //minor third
    // } else this.note = note;

    Bullet.list[this.id] = this;

    this.timeout = setTimeout(() => {
      // delete itself after timeout??
      this.destroy();
    }, this.durationMs);

    this.allowNextShotTimeout = setTimeout(()=>{
      // allow next shot slightly earlier than this bullet destroys itself (after it's duration)
      this.parent.hasShotScheduled = false;
    }, this.durationMs * 0.75);

    return this;
  }

  update() {
    this.x += this.spdX;
    this.y += this.spdY;

    this.spdX *= 1.01;
    this.spdY *= 1.01;

    //collision check
    let hitPlayerId = this.collidingPlayerId(
      Character.list,
      Character.quadtree
    );
    let isCollidingWall = Tile.checkTilesCollision(this.x, this.y, Tile.wallQTree);

    //player hit:
    if (hitPlayerId != null) {
      let targetPlayer = Character.list[hitPlayerId];
      if (this.parent != targetPlayer) {
        this.destroy();
        targetPlayer.takeDmg(this.damage, this.parent);
      }
    }

    //bullet self-guiding
    this.selfGuide();

    //wall hit:
    if (isCollidingWall) {
      this.destroy();
    }
  }

  findNearestSameNote(objList, maxDistance) {
    //TODO: room for optimization
    let nearest = null;
    let minDistSq = maxDistance * maxDistance;

    const nearestCandidates = Bullet.quadtree.retrieve({
      x: this.x - maxDistance,
      y: this.y - maxDistance,
      width: maxDistance * 2,
      height: maxDistance * 2,
    });

    //checking quadtree efficiency:
    // console.log(nearestCandidates.length, Object.keys(objList).length)

    if (nearestCandidates.length == 0) return null;
    for (let candidate of nearestCandidates) {
      const other = objList[candidate.id];
      if (!other) continue;
      if (other === this) continue;
      if (other.parent === this.parent) continue;
      if (other.note !== this.note) continue;

      const dx = this.x - other.x;
      const dy = this.y - other.y;
      const distSq = dx * dx + dy * dy;

      if (distSq < minDistSq) {
        minDistSq = distSq;
        nearest = other;
      }
    }

    // for(let i in objList){
    //     let other = objList[i];

    //     if(other === this) continue;
    //     if(other.parent === this.parent) continue;
    //     if(other.note !== this.note) continue;

    //     const dx = this.x - other.x;
    //     const dy = this.y - other.y;
    //     const distSq = dx*dx + dy*dy;

    //     if(distSq < minDistSq){
    //         minDistSq = distSq;
    //         nearest = other;
    //     }

    //     // if(minDistSq < 500){
    //     //     this.destroy();
    //     // }
    // }

    return nearest;
  }

  selfGuide() {
    //self-guide to the nearest bullet with same note/tone:
    let nearestSameBullet = this.findNearestSameNote(Bullet.list, 600); //have to check 1) type 2) parent
    if (nearestSameBullet) {
      this.guideTo(nearestSameBullet);
      return;
    }

    //self-guide to the nearest player/bot in set range:
    let nearestPlayer = this.findNearest(
      Character.list,
      Character.quadtree,
      300
    );

    if (nearestPlayer === this.parent) return;
    if (nearestPlayer) {
      this.guideTo(nearestPlayer);
      return;
    }
  }

  guideTo(obj) {
    const dx = obj.x - this.x;
    const dy = obj.y - this.y;
    const dist = Math.hypot(dx, dy);
    const targetSpdX = (dx / dist) * this.speed;
    const targetSpdY = (dy / dist) * this.speed;

    //weighted mean between current speeds and guiding speed:
    //(3 to 1 weights)
    this.spdX = (3 * this.spdX + targetSpdX) / 4;
    this.spdY = (3 * this.spdY + targetSpdY) / 4;
  }

  destroy() {
    clearTimeout(this.timeout);
    for (let i in Player.list) {
      let player = Player.list[i];
      player.addToRemovePack(this.id, "bullet");
    }
    delete Bullet.list[this.id];
  }

  static updateAll() {
    for (var i in Bullet.list) {
      var bullet = Bullet.list[i];

      bullet.update();
    }
  }
}
