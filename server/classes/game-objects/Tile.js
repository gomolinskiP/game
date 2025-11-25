import Quadtree from "@timohausmann/quadtree-js";
import { Map } from "../Map.js";
import { v4 as uuidv4 } from "uuid";

function screenToIso(x, y) {
  return {
    x: (2 * y + x) / 2,
    y: (2 * y - x) / 2,
  };
}

function isoToScreen(x, y) {
  return {
    x: x - y,
    y: (x + y) / 2,
  };
}

export class Tile {
  static list = {};
  static quadtree;

  static mapBoundRect;
  // static qTree = new Quadtree(mapBoundRect);
  static W = 64;
  static H = 32;

  static floorQTree;
  static wallQTree;
  static noPVPfloorQTree;

  static createQuadtree(rect){
    Tile.quadtree = new Quadtree(rect);

    for (let id in Tile.list) {
      const tile = Tile.list[id];
      Tile.quadtree.insert({
        x: tile.x,
        y: tile.y,
        width: 64,
        height: 64,
        id: tile.id,
      });
    }
  }

  static createFloorQTree(rect){
    Tile.floorQTree = new Quadtree(rect);
    Tile.noPVPfloorQTree = new Quadtree(rect);

    const floorLayer = Map.loadLayer(Map.mapData, "floor");
    const floorTiles = Map.loadLayerTiles(floorLayer);

    for(let tile of floorTiles){
      Tile.floorQTree.insert({
        x: tile.x,
        y: tile.y,
        width: 64,
        height: 64,
        isoX: tile.isoX,
        isoY: tile.isoY,
      });

      //201 is the gid for yellow floor tile (special for non-PVP area):
      if (tile.gid == 201){
        Tile.noPVPfloorQTree.insert({
            x: tile.x,
            y: tile.y,
            width: 64,
            height: 64,
            isoX: tile.isoX,
            isoY: tile.isoY,
        });
      }
    }
  }

  static createWallQTree(rect){
    Tile.wallQTree = new Quadtree(rect);

    const wall1Layer = Map.loadLayer(Map.mapData, "wall1");
    const wall2Layer = Map.loadLayer(Map.mapData, "wall2");
    const wall1Tiles = Map.loadLayerTiles(wall1Layer);
    const wall2Tiles = Map.loadLayerTiles(wall2Layer);

    const wallTiles = wall1Tiles.concat(wall2Tiles);

    for (let tile of wallTiles) {
      Tile.wallQTree.insert({
        x: tile.x,
        y: tile.y,
        width: 64,
        height: 64,
        isoX: tile.isoX,
        isoY: tile.isoY,
      });
    }
  }

  static rectColl(r1, r2) {
    return (
      r1.x + r1.w > r2.x &&
      r1.x < r2.x + r2.w &&
      r1.y + r1.h > r2.y &&
      r1.y < r2.y + r2.h
    );
  }

  static checkTilesCollision(x, y, quadtree) {
    let { x: isoObjX, y: isoObjY } = Map.screenToIso(x, y);

    //TODO this is ok for floor collision, but x, y, w & h should be different for wall collision
    let objRect = {
      x: isoObjX + 12,
      y: isoObjY + 44,
      w: 0,
      h: 0,
    };

    const collCandidates = quadtree.retrieve({
      x: x - 32,
      y: y - 32,
      width: 64,
      height: 64,
    });
    // console.log(`${tileArr.length} ${collCandidates.length}`);

    if (collCandidates.length < 1) return false;
    for (let candidate of collCandidates) {
      let tileRect = {
        x: candidate.isoX,
        y: candidate.isoY,
        w: 32,
        h: 32,
      };

      if (Tile.rectColl(tileRect, objRect)) {
        return true;
      }
    }

    return false;
  }

  static checkIfWalkablePosition(x, y){
    return Tile.checkTilesCollision(x, y, Tile.wallQTree) ||
        !Tile.checkTilesCollision(x, y, Tile.floorQTree);
  }

  static getRandomWalkablePos(){
    let x, y;
    let isPositionForbidden = true;

    while(isPositionForbidden){
      x = Map.boundRect.x + Map.boundRect.width * Math.random();
      y = Map.boundRect.y + Map.boundRect.height * Math.random();

      isPositionForbidden = this.checkIfWalkablePosition(x, y);
    }

    return {x, y};
  }

  constructor(gid, ortX, ortY, layerId) {
    this.gid = gid;
    this.x = ortX;
    this.y = ortY;
    this.layerId = layerId;

    let scr = Map.screenToIso(this.x, this.y);

    // this.x = scr.x;
    // this.y = scr.y;

    this.isoX = scr.x;
    this.isoY = scr.y;

    this.width = 32;
    this.height = 32;

    this.id = uuidv4();
    Tile.list[this.id] = this;
    // Tile.qTree.insert({
    //     x: this.ortX,
    //     y: this.ortY,
    //     width: 64,
    //     height: 64,
    //     id: this.id,
    // })
  }
}
