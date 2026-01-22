import { Entity } from "./Entity.js";
import { Weapon } from "./Weapon.js";
import { Socket } from "../Socket.js";
import { Sounds } from "../musical/Sounds.js";
import { Tile } from "./Tile.js";
import Quadtree from "@timohausmann/quadtree-js";
import { HighScore } from "../HighScore.js";

export class Character extends Entity {
  static list = {};
  static shooterList = {};
  static shooterListInit(){
    for (let d of Weapon.allowedDurations) {
      this.shooterList[d] = new Set;
    }
  }
  
  
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
        hp: character.hp
      });
    }
  }

  constructor(id, x, y, username, weapon = null, score = 0) {
    super(x, y);
    this.id = id;
    this.name = username;
    this.fullHP = this.hp = Character.fullHP;
    this.framesSinceDamage = 0;

    this.score = score;
    HighScore.notify(this.name, this.score);

    this.entityType = "player";

    this.toUpdate = {};
    this.needsUpdate = false;

    this.pressingUp =
      this.pressingDown =
      this.pressingLeft =
      this.pressingRight =
        false;
        
    this.isShooting = {state: false, noteID: 0};
    this.outOfMetronomeSchedule = null;

    this.speed = 10;
    this.lastAngle = 90;
    this.ownBulletsIDs = [];

    this.selectedNote = Sounds.scale.base;
    this.selectedNoteID = 0;

    if (weapon == null) {
      this.giveRandomWeapon();
    }
    else{
      this.giveWeapon(weapon.sound, weapon.duration, weapon.type);
    }

    this.scheduledBullets = [];

    Character.list[this.id] = this;

    return this;
  }

  updatePosition() {
    if(this.isDead) return;
    if(this.characterType == "player" && this.isPlaying == false) return;

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
      // this.needsUpdate = false;
      this.spdX = 0;
      this.spdY = 0;
      }
    else {
      const newAngle = (Math.atan2(this.dirY, this.dirX) * 180) / Math.PI;
      if(this.lastAngle != newAngle){
        this.lastAngle = newAngle;
        this.toUpdate.direction = this.lastAngle;
        this.needsUpdate = true;
      }
      
      

      this.spdX = Math.cos((this.lastAngle / 180) * Math.PI) * this.speed;
      this.spdY = Math.sin((this.lastAngle / 180) * Math.PI) * this.speed / 2; // /2 because the map is isometric and we account for perspective

      //check collision with collisionLayer:
      let newX = this.x + this.spdX;
      let newY = this.y + this.spdY;
      if (
        Tile.checkTilesCollision(newX, newY, Tile.floorQTree) &&
        !Tile.checkTilesCollision(newX, newY, Tile.wallQTree)
      ) {
        this.x = newX;
        this.y = newY;

        this.toUpdate.x = this.x;
        this.toUpdate.y = this.y;
        this.needsUpdate = true;

        //check if character entered nonPVP area while shooting:
        if (this.isInNonPVPArea() && this.isShooting.state) {
            this.setShootingState(false, this.isShooting.noteID);
        }

        //update all scheduledBullets positions:
        for (const scheduledBullet of this.scheduledBullets) {
          scheduledBullet.updatePosition(this.x, this.y);
        }
      }
      else{
          // negative rewards for bots walking into collision:
          if (this.characterType == "bot"){ 
            this.walkedIntoCollision = true;
          }
      }
    }

    //slowly heal if was not damaged for some time:
    //todo heals only if needsupdate is true
    this.framesSinceDamage += 1;
    if (this.framesSinceDamage > 100 && this.framesSinceDamage%10==0) this.heal(1);
  }

  giveRandomWeapon(){
    const weapon = new Weapon(
        Weapon.allowedSounds[
            Math.floor(Math.random() * Weapon.allowedSounds.length)
        ],
        Weapon.allowedDurations[
            Math.floor(Math.random() * Weapon.allowedDurations.length)
        ],
        Weapon.allwedTypes[
            Math.floor(Math.random() * Weapon.allwedTypes.length)
        ],
        this
    );

    this.giveWeapon(weapon.sound, weapon.duration, weapon.type);
  }

  updateShooterListOnDurationChange(prevDuration, newDuration){
    // this.needsUpdate = true;
    if(this.isShooting.state){
      Character.shooterList[prevDuration].delete(this);
      Character.shooterList[newDuration].add(this);
    }
  }

  setShootingState(isShooting, noteID){
    if(this.isDead) return;
    if(this.characterType == "player" && this.isPlaying == false) return;

    // this.isShooting = isShooting;
    if(!isShooting && noteID != this.isShooting.noteID){
      //return if player stopped pressing a key that was not his last note
      return;
    }

    this.isShooting = {state: isShooting, noteID: noteID};
    this.selectedNoteID = noteID;

    //prevent starting shooting on spawn area:
    if (this.isInNonPVPArea() && isShooting) {
        Socket.emitShootFeedbackMsg(
            this,
            "Shooting notes is not allowed near spawn area!",
            "bad"
        );
        this.isShooting.state = false;
    }

    this.toUpdate.isShooting = this.isShooting.state;
    this.toUpdate.selectedNoteID = this.selectedNoteID;
    this.needsUpdate = true;

    if(this.isShooting.state){
      //add character to list of characters shooting with current weapon duration
      Character.shooterList[this.weapon.duration].add(this);

      this.weapon.shootCount = 0;
    }
    else{
      //remove character from list of characters shooting with current weapon duration
      Character.shooterList[this.weapon.duration].delete(this);

      //remove out-of-metronome scheduled shot
      //(for some durations that's notes start between metronome ticks):
      if(this.outOfMetronomeSchedule){
        clearTimeout(this.outOfMetronomeSchedule);
        this.outOfMetronomeSchedule = null;
      }
    }
  }

  giveWeapon(sound, duration, type) {
    this.weapon = new Weapon(sound, duration, type, this);
  }

  addScore(points) {
    if (this.isDead) return;
    if (this.characterType == "player" && this.isPlaying == false) return;

    this.score += points;
    HighScore.notify(this.name, this.score);

    this.toUpdate.score = this.score;
    this.needsUpdate = true;
  }

  takeDmg(damage, attacker) {
    if (this.isDead) return;
    if (this.characterType == "player" && this.isPlaying == false) return;

    this.hp -= damage;

    this.framesSinceDamage = 0;
    if (this.hp <= 0) {
      this.die(attacker);
      this.hp = 0;
    }
    this.toUpdate.hp = this.hp;
    this.needsUpdate = true;
    // this.needsUpdate = true;
  }

  heal(hpAmount) {
    if (this.isDead) return;
    if (this.characterType == "player" && this.isPlaying == false) return;

    if(this.hp >= Character.fullHP) return;

    this.hp += hpAmount;
    if (this.hp > Character.fullHP) {
      this.hp = Character.fullHP;
    }

    this.toUpdate.hp = this.hp;
    this.needsUpdate = true;
    // this.needsUpdate = true;
  }

  die(byWho) {
    //killer gets half of victims score:
    const scoreStolen = this.score / 2;
    byWho.addScore(scoreStolen);
    this.score -= scoreStolen;
    HighScore.notify(this.name, this.score);

    this.toUpdate.score = this.score;
    this.needsUpdate = true;

    //send info to all sockets:
    let killMsg = `<i>${byWho.name} killed ${this.name}</i>`;
    for (var i in Socket.list) {
      var socket = Socket.list[i];
      socket.emit("gameMessageBroadcast", killMsg);
    }

    //send info to killed player:
    if(this.characterType == "player"){
      this.updatePack.death = {
          type: "death",
          killer: byWho.name,
          scoreStolen: scoreStolen
      };
    }

    //stop shooting when died:
    this.setShootingState(false, this.isShooting.noteID);

    //hp to update:
    this.toUpdate.hp = 0;
    this.needsUpdate = true;
    // console.log('to update hp', this.toUpdate.hp);

    //set isDead flag to true:
    this.hp = 0;
    this.isDead = true;
  }

  spawn(){
      //respawn:
      this.hp = Character.fullHP;
      this.x = 0 + 250 * Math.random();
      this.y = 0 + 120 * Math.random();
      this.lastAngle = 90;

      this.toUpdate.x = this.x;
      this.toUpdate.y = this.y;
      this.toUpdate.direction = this.lastAngle;
      this.toUpdate.hp = this.hp;
      this.needsUpdate = true;

      // this.needsUpdate = true;

      this.isDead = false;
  }

  remove(){
    Character.shooterList[this.weapon.duration].delete(this);

    delete Character.list[this.id];
  }
}