import { Entity } from "./Entity.js";
import { Weapon } from "./Weapon.js";
import { Pickup } from "./Pickup.js";
import { Socket } from "../Socket.js";
import { Sounds } from "../musical/Sounds.js";
import { Tile } from "./Tile.js";
import Quadtree from "@timohausmann/quadtree-js";

const loadDistance = 100; //TODO: should be AT LEAST double the LONGEST distance a bullet can travel!!!
const loadUnloadMargin = 50;
const unloadDistance = loadDistance + loadUnloadMargin;

export class Character extends Entity {
  static list = {};
  static quadtree;
  static fullHP = 1000;

  static createQuadtree(rect) {
    Character.quadtree = new Quadtree(rect);
  }

  static refreshQuadtree() {
    Character.quadtree.clear();

    for (let id in Character.list) {
      const character = Character.list[id];
      Character.quadtree.insert({
        x: character.x - 32,
        y: character.y - 32,
        width: 64,
        height: 64,
        id: id,
      });
    }
  }

  constructor(id, x, y, username, weapon = null, score = 0) {
    super(x, y);
    this.id = id;
    this.name = username;
    this.fullHP = this.hp = Character.fullHP;
    this.score = score;
    // this.socketIDs = [id]; //bots won't have socket ids

    this.entityType = "player";

    this.needsUpdate = true;

    this.pressingUp =
      this.pressingDown =
      this.pressingLeft =
      this.pressingRight =
        false;
    this.speed = 10;
    this.lastAngle = 90;
    this.hasShotScheduled = false;

    this.selectedNote = Sounds.scale.base;

    if (weapon == null) weapon = new Weapon("Synth", "1n", "normal", this);
    this.giveWeapon(weapon.sound, weapon.duration, "normal");

    this.scheduledBullets = [];

    Character.list[this.id] = this;

    return this;
  }

  updatePosition() {
    if (this.pressingUp) {
      this.dirY = -1;
    } else if (this.pressingDown) {
      this.dirY = 1;
    } else {
      this.dirY = 0;
    }
    if (this.pressingLeft) {
      this.dirX = -1;
    } else if (this.pressingRight) {
      this.dirX = 1;
    } else {
      this.dirX = 0;
    }

    if (
      !this.pressingUp &&
      !this.pressingDown &&
      !this.pressingLeft &&
      !this.pressingRight
    ){
      // console.log("---") //TO FIX -- animation does not stop when player stops walking because he stops getting updated!!
      this.needsUpdate = false;
      this.spdX = 0;
      this.spdY = 0;
      // if(this.agentReward){
        // this.agentReward -= 0.1;
      // }
      }
    else {
      this.dirY *= 50 / 100; //SCALER if map image is in perspective
      this.lastAngle = (Math.atan2(this.dirY, this.dirX) * 180) / Math.PI;
      this.spdX = Math.cos((this.lastAngle / 180) * Math.PI) * this.speed;
      this.spdY = Math.sin((this.lastAngle / 180) * Math.PI) * this.speed;

      //check collision with collisionLayer:
      let newX = this.x + this.spdX;
      let newY = this.y + this.spdY;

      if (
        Tile.checkTilesCollision(newX, newY, Tile.floorQTree) &&
        !Tile.checkTilesCollision(newX, newY, Tile.wallQTree)
      ) {
        this.x = newX;
        this.y = newY;

        // if(this.agentReward){
          // this.agentReward += 0.5;
        // }

        //update all scheduledBullets positions:
        for (const scheduledBullet of this.scheduledBullets) {
          scheduledBullet.updatePosition(this.x, this.y);
        }
      }
      else{
        // negative rewards for bots walking into collision:
          this.walkingReward -= 1;
      }
    }

    //shooting:
    // if(this.pressingSpace){
    //     //shooting not allowed on spawn:
    //     if(this.isWithinDistance({
    //         x: 0,
    //         y: 0
    //     }, 1600)) return;
    //     this.needsUpdate = true;
    //     if(!this.hasShotScheduled){

    //         this.hasShotScheduled = true;
    //         let newBullets = this.weapon.shoot(this.selectedNote);
    //         //add to this players scheduled bullet list:
    //         this.scheduledBullets = this.scheduledBullets.concat(newBullets);
    //         // console.log(`scheduledBullets for player ${this.scheduledBullets}`)

    //         // setTimeout(()=>{
    //         //     this.shootTimeout = false
    //         // }, this.shootTimeoutTime)
    //     }
    // }
  }

  shoot() {
    if(this.hasShotScheduled){
      Socket.emitShootFeedbackMsg(this, 'Trying to shoot to early after your previous shot!', 'bad');
      return;
    }

    let timeInaccuracy = Sounds.evaluateNoteTimingAccuracy(this.weapon.duration, this.weapon.durationType);

    let inaccuracyType;
    if(timeInaccuracy >= 0){
      //shot timing perfect or late:
      inaccuracyType = 'late';
    }
    else{
      //shot timing perfect or early:
      inaccuracyType = "early";
      timeInaccuracy = -timeInaccuracy; //we want absolute value for later
    }

    if(timeInaccuracy > Sounds.maxTimeInaccuracy){
      Socket.emitShootFeedbackMsg(this, 'Shot to ' + inaccuracyType + ' to spawn a note!', 'bad');
      return;
    }

    this.hasShotScheduled = true;
    if(timeInaccuracy < Sounds.perfectTimeInaccuracy){
      Socket.emitShootFeedbackMsg(this, 'Perfect timing!', 'good');
    }
    else{
      Socket.emitShootFeedbackMsg(this, 'Timing ' + timeInaccuracy + ' to ' + inaccuracyType, 'ok');
    }

    this.weapon.shoot(this.selectedNote);


    // //shooting not allowed on spawn:
    // if (
    //   this.isWithinDistance(
    //     {
    //       x: 0,
    //       y: 0,
    //     },
    //     1600
    //   )
    // )
    //   return;
    // this.needsUpdate = true;
    // if (!this.hasShotScheduled) {
    //   this.hasShotScheduled = true;
    //   let newBullets = this.weapon.shoot(this.selectedNote);
    //   //add to this players scheduled bullet list:
    //   this.scheduledBullets = this.scheduledBullets.concat(newBullets);
    //   // console.log(`scheduledBullets for player ${this.scheduledBullets}`)

    //   // setTimeout(()=>{
    //   //     this.shootTimeout = false
    //   // }, this.shootTimeoutTime)
    // } else {
    //   if (this.updatePack) {
    //     this.updatePack.push({
    //       msg: "To early to shoot!",
    //       type: "gameMsg",
    //     });
    //   }
    // }
  }

  giveWeapon(sound, duration, type) {
    this.weapon = new Weapon(sound, duration, type, this);
    let durationInt = parseInt(duration.replace("n", "").replace(".", ""));
    switch (this.weapon.durationType) {
      case "normal":
        this.shootTimeoutTime = (60000 / 120) * (4 / durationInt);
        break;
      case "dotted":
        this.shootTimeoutTime = ((60000 / 120) * (4 / durationInt) * 3) / 2;
        break;
    }
  }

  addScore(points) {
    this.score += points;
  }

  changeSelectedNote(note) {
    //TODO check if note is allowed!
    this.selectedNote = note;
  }

  takeDmg(damage, attacker) {
    this.hp -= damage;
    if (this.hp <= 0) {
      this.die(attacker);
    }
    this.needsUpdate = true;
  }

  heal(hpAmount) {
    this.hp += hpAmount;
    if (this.hp > Character.fullHP) {
      this.hp = Character.fullHP;
    }
  }

  die(byWho) {
    byWho.addScore(100);
    let killMsg = `<i>${byWho.name} killed ${this.name}</i>`;
    for (var i in Socket.list) {
      var socket = Socket.list[i];
      socket.emit("chatBroadcast", killMsg);
    }
    this.hp = Character.fullHP;
    this.x = 0 + 250 * Math.random();
    this.y = 0 + 120 * Math.random();
    this.needsUpdate = true;
  }
}
