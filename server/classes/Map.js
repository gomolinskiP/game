import { createRequire } from "module";
const require = createRequire(import.meta.url);
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { readFile } from "fs/promises";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { Tile } from "./Tile.js";

export class Map {
  static mapXmin = 0;
  static mapXmax = 0;
  static mapYmin = 0;
  static mapYmax = 0;

  static mapData;

  static boundRect = {};

  static async loadMapData() {
    const filePath = resolve(__dirname, "../../client/map3.json");
    const jsonData = JSON.parse(await readFile(filePath, "utf-8"));

    Map.mapData = jsonData;
    return;
  }

  static loadLayer(mapData, layerName) {
    for (let layer of mapData.layers) {
      if (layer.name == layerName) {
        return layer;
      }
    }
    return null; //if layer not found return null;
  }

  static screenToIso(x, y) {
    return {
      x: (2 * y + x) / 2,
      y: (2 * y - x) / 2,
    };
  }

  static loadLayerTiles(layer) {
    let tileArr = [];
    let wallOffset = 0;
    if (layer.name.includes("wall")) {
      let wallLayerNum = parseInt(layer.name.replace("wall", ""));
      wallOffset = 32 * wallLayerNum;
    }

    for (const chunk of layer.chunks) {
      const width = chunk.width;
      const height = chunk.height;
      const tileW = 64;
      const tileH = 32;
      const offsetX = layer.offsetx || 0;
      const offsetY = layer.offsety || 0;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const index = y * width + x;
          const gid = chunk.data[index];
          if (gid == 0) continue;

          // if (!gid || !tileImages[gid]) continue;

          // const img = tileImages[gid];

          // position:
          const tileX = chunk.x + x;
          const tileY = chunk.y + y;

          //tile coordinates in orthogonal system (in game coordinates):
          const ortX = ((tileX - tileY) * tileW) / 2 + offsetX; //weird shift TO FIX
          const ortY =
            ((tileX + tileY) * tileH) / 2 + offsetY - tileH + wallOffset;

          //update global map bounds:
          if (ortX < Map.mapXmin) Map.mapXmin = ortX;
          if (ortX > Map.mapXmax) Map.mapXmax = ortX + 64;
          if (ortY < Map.mapYmin) Map.mapYmin = ortY;
          if (ortY > Map.mapYmax) Map.mapYmax = ortY + 64;

          Map.updateMapBoundRect();

          let scr = Map.screenToIso(ortX, ortY);

          tileArr.push({
            layer: layer.name,
            gid: gid,
            isoX: scr.x,
            isoY: scr.y,
            width: 32,
            height: 32,
            x: ortX,
            y: ortY,
            wallOffset: wallOffset,
          });
        }
      }
    }

    return tileArr;
  }

  static updateMapBoundRect() {
    Map.boundRect = {
      x: Map.mapXmin,
      y: Map.mapYmin,
      width: Map.mapXmax - Map.mapXmin,
      height: Map.mapYmax - Map.mapYmin,
    };
  }

  static loadAllTiles() {
    //load all map layers tiles:
    let layerId = -4; //because 4 layers are lower than player
    for (const layer of Map.mapData.layers) {
      if (layer.type !== "tilelayer" || layer.visible == false) continue;
      layerId += 1;

      let tileArr = Map.loadLayerTiles(layer);
      for (const tile of tileArr) {
        new Tile(tile.gid, tile.x, tile.y - tile.wallOffset, layerId);
      }
    }
  }
}
