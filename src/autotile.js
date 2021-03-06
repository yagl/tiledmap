/**
 * glossary:
 * - tile: a tile which can be drawn on the map
 * - tileset: a collection of tiles in a single image
 * - autotile: a small collection of tiles in a single image, these tiles are
 *   auto-transitioning. the autotile image must follow the given pattern to
 *   render properly: http://i.imgur.com/fDc7IdL.png
 *
 * compile an autotile for use in a tiledmap. since a tile is represented by
 * a signed integer in memory and we can have multiple autotiles, we need to
 * store multiple information:
 * - a tile can be from tileset or from one of the autotile
 * - an autotile tile needs to know which autotile it refers to
 * - an autotile tile needs to store how it is oriented, where are corners
 *   and plain textures
 *
 * since positive index are already used for the tileset and we use an array of
 * integers to store an entire map layer, we use negative indexes for
 * autotiles. order of the autotiles is VERY IMPORTANT since the negative index
 * stores both the autotile index and the autotile type itself
 *
 * therefore, a layer data array will follow the rules below:
 *
 * | Range        | Description                                                        |
 * |--------------|--------------------------------------------------------------------|
 * | 1 to MAX_INT | index of a tileset tile                                            |
 * | 0            | empty tile                                                         |
 * | -1 to -255   | index of an autotile tile which belongs to the first map autotile  |
 * | -256 to -511 | index of an autotile tile which belongs to the second map autotile |
 *
 * in words:
 * - a positive index corresponds to a tile from the tileset
 * - a null/zero index corresponds to an empty/transparent tile
 * - a negative index corresponds to a tile from an autotile
 */

var Autotile, Direction, Tile, Corner, compileLayer;

// defines the four types of possible corners
Corner = {
  TopLeft: 0,
  TopRight: 1,
  BottomLeft: 2,
  BottomRight: 3
};

// schema of directions relative to the current tile
//  +---+---+---+
//  | 1 | 2 | 4 |
//  +-----------+
//  | 8 |   |16 |
//  +-----------+
//  |32 |64 |128|
//  +---+---+---+
Direction = {
  TopLeft: 1,
  Top: 2,
  TopRight: 4,
  Right: 16,
  BottomRight: 128,
  Bottom: 64,
  BottomLeft: 32,
  Left: 8
};

// schemas of the tiles types, where the top left corner is the reference
// corner
// +-+                       +
// |   IntCorner                 ExtCorner
// +
//
// +                         +-+
// |   FirstSide                 SecondSide
// +
//
//     Plain (full of texture)
Tile = {
  ExtCorner: 0,
  IntCorner: 1,
  FirstSide: 2,
  SecondSide: 3,
  Plain: 4
};

var Corners = [1, 2, 4, 16, 128, 64, 32, 8];

/**
 * @description give the position of a couple tile type/corner on the
 * tileset image
 * @param corner {*} the type of corner
 * @param tile {Tile} the type of tile
 */
function getCornerImagePosition(corner, tile) {
  switch(corner) {
    case Corner.TopLeft:
      switch(tile) {
        case Tile.ExtCorner:
          return {
            x: 32,
            y: 0
          };
          break;
        case Tile.IntCorner:
          return {
            x: 0,
            y: 32
          };
          break;
        case Tile.FirstSide:
          return {
            x: 0,
            y: 64
          };
          break;
        case Tile.SecondSide:
          return {
            x: 32,
            y: 32
          };
          break;
        case Tile.Plain:
          return {
            x: 32,
            y: 64
          };
          break;
      }
      break;
    case Corner.TopRight:
      switch(tile) {
        case Tile.ExtCorner:
          return {
            x: 32 + 16,
            y: 0
          };
          break;
        case Tile.IntCorner:
          return {
            x: 32 + 16,
            y: 32
          };
          break;
        case Tile.FirstSide:
          return {
            x: 16,
            y: 32
          };
          break;
        case Tile.SecondSide:
          return {
            x: 32 + 16,
            y: 64
          };
          break;
        case Tile.Plain:
          return {
            x: 16,
            y: 64
          };
          break;
      }
      break;
    case Corner.BottomLeft:
      switch(tile) {
        case Tile.ExtCorner:
          return {
            x: 32,
            y: 16
          };
          break;
        case Tile.IntCorner:
          return {
            x: 0,
            y: 64 + 16
          };
          break;
        case Tile.FirstSide:
          return {
            x: 32,
            y: 64 + 16
          };
          break;
        case Tile.SecondSide:
          return {
            x: 0,
            y: 32 + 16
          };
          break;
        case Tile.Plain:
          return {
            x: 32,
            y: 32 + 16
          };
          break;
      }
      break;
    case Corner.BottomRight:
      switch(tile) {
        case Tile.ExtCorner:
          return {
            x: 32 + 16,
            y: 16
          };
          break;
        case Tile.IntCorner:
          return {
            x: 32 + 16,
            y: 64 + 16
          };
          break;
        case Tile.FirstSide:
          return {
            x: 32 + 16,
            y: 32 + 16
          };
          break;
        case Tile.SecondSide:
          return {
            x: 16,
            y: 64 + 16
          };
          break;
        case Tile.Plain:
          return {
            x: 16,
            y: 32 + 16
          };
          break;
      }
      break;
  }
}


function getWithShift(array, index) {
  if (!array.length) {
    return null;
  }

  if (index < 0) {
    index = array.length - 1;
  } else if (index >= array.length) {
    index = index % array.length;
  }

  return array[index % (array.length)];
}

function getCornerTileType(corner, near) {
  // corner offset
  var cOff = 0,
  // default tile tile
      type = Tile.IntCorner;

  // top left is default value
  switch (corner) {
    case Corner.TopRight:
      cOff = 2;
      break;
    case Corner.BottomRight:
      cOff = 4;
      break;
    case Corner.BottomLeft:
      cOff = 6;
      break;
  }

  /*jshint bitwise:false*/

  // test adjacent tiles flags
  if (near & getWithShift(Corners, cOff - 1)) {
    type = Tile.SecondSide;

    if (near & getWithShift(Corners, cOff + 1)) {
      type = Tile.Plain;

      if (!(near & getWithShift(Corners, cOff))) {
        type = Tile.ExtCorner;
      }
    }
  } else if (near & getWithShift(Corners, cOff + 1) &&
      !(near & getWithShift(Corners, cOff - 1))) {
    type = Tile.FirstSide;
  }

  /*jshint bitwise:true*/

  return type;
}

Autotile = function (autotile, padd) {
  this.padd = padd;

  this.name = autotile.name;
  this._id = autotile._id;
  this.src = autotile.src;

  this.image = autotile;

  this.canvas = document.createElement('canvas');
  this.canvas.width = 32;
  this.canvas.height = 8192;

  this.ctx = this.canvas.getContext('2d');
};

Autotile.prototype.drawTile = function (ctx, tile, xDest, yDest) {
  ctx.drawImage(this.canvas, 0, tile * 32, 32, 32, xDest, yDest, 32, 32);
};

Autotile.prototype.compile = function () {
  var i, tlc, trc, blc, brc, pos;

  for (i = 0; i < 256; i += 1) {
    tlc = getCornerTileType(Corner.TopLeft, i);
    trc = getCornerTileType(Corner.TopRight, i);
    blc = getCornerTileType(Corner.BottomLeft, i);
    brc = getCornerTileType(Corner.BottomRight, i);

    // top left
    pos = getCornerImagePosition(Corner.TopLeft, tlc);
    this.ctx.drawImage(this.image,
        pos.x, pos.y, 16, 16, 0, i * 32, 16, 16);

    // top right
    pos = getCornerImagePosition(Corner.TopRight, trc);
    this.ctx.drawImage(this.image,
        pos.x, pos.y, 16, 16, 16, i * 32, 16, 16);

    // bottom right
    pos = getCornerImagePosition(Corner.BottomRight, brc);
    this.ctx.drawImage(this.image,
        pos.x, pos.y, 16, 16, 16, i * 32 + 16, 16, 16);

    // bottom left
    pos = getCornerImagePosition(Corner.BottomLeft, blc);
    this.ctx.drawImage(this.image,
        pos.x, pos.y, 16, 16, 0, i * 32 + 16, 16, 16);
  }
};

/**
 * @description return the id of a tile if in limits, null otherwise
 * @param x
 * @param y
 * @param layer
 * @param size
 * @returns {*}
 */
function getIdOrNull(x, y, layer, size) {
  if (x < 0 || y < 0 || x >= size.w || y >= size.h) {
    return null;
  }

  return layer[y * size.w + x];
}

function isSameAutotile(tile, offset) {
  if (tile >= 0) return false;

  tile = -tile;
  var off = Math.floor((tile - 1) / 256);

  return off === offset;
}

function getTile(x, y, layer, size) {
  if (x < 0 || y < 0 || x >= size.w || y >= size.h) {
    return null;
  }

  return layer[y * size.w + x];
}

var compileLayer = function (layer, size, offset) {
  var x = 0, y = 0, compiled  = [], sum;


  // calculate adjacent tiles flags
  for (; y < size.h; y += 1) {
    for (x = 0; x < size.w; x += 1) {
      // test if current tile corresponds to the current offset
      if (isSameAutotile(getTile(x, y, layer, size), offset)) {
        sum = 0;

        // top left
        if (isSameAutotile(getTile(x - 1, y - 1, layer, size), offset)) {
          sum += 1;
        }

        // top
        if (isSameAutotile(getTile(x, y - 1, layer, size), offset)) {
          sum += 2;
        }

        // top right
        if (isSameAutotile(getTile(x + 1, y - 1, layer, size), offset)) {
          sum += 4;
        }

        // left
        if (isSameAutotile(getTile(x - 1, y, layer, size), offset)) {
          sum += 8;
        }

        // right
        if (isSameAutotile(getTile(x + 1, y, layer, size), offset)) {
          sum += 16;
        }

        // bottom left
        if (isSameAutotile(getTile(x - 1, y + 1, layer, size), offset)) {
          sum += 32;
        }

        // bottom
        if (isSameAutotile(getTile(x, y + 1, layer, size), offset)) {
          sum += 64;
        }

        // bottom right
        if (isSameAutotile(getTile(x + 1, y + 1, layer, size), offset)) {
          sum += 128;
        }
        layer[y * size.w + x] = (-((offset) * 256 + sum + 1));
      }
    }
  }
};