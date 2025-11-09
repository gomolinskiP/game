import { Entity } from "./Entity.js";
import { Player } from "./Player.js";
import { Sounds } from "../musical/Sounds.js";
import { Character } from "./Character.js";
import { Tile } from "./Tile.js";
import Quadtree from "@timohausmann/quadtree-js";

const BOT_TRAINING = Boolean(process.env.BOT_TRAINING);


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
        parentID: bullet.parent.id
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
    this.spdY = Math.sin((angle / 180) * Math.PI) * this.speed / 2;

    this.note = note;
    this.sound = parent.weapon.sound;
    this.duration = parent.weapon.duration;
    this.durationMs = durationMs;
    this.damage = damage;

    Bullet.list[this.id] = this;

    this.timeout = setTimeout(() => {
      // delete itself after timeout:
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

    // this.spdX *= 1.01;
    // this.spdY *= 1.01;

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

    if(!BOT_TRAINING){
      let nearestSameBullet = this.findNearestSameNote(Bullet.list, 600); //have to check 1) type 2) parent
      if (nearestSameBullet) {
        this.guideTo(nearestSameBullet);
        return;
      }
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
