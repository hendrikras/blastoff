import {Physics, Types, Math as PMath} from 'phaser';
import Crate from './gameobjects/Crate';
import ArcadeBodyBounds = Phaser.Types.Physics.Arcade.ArcadeBodyBounds;

type Direction = Types.Physics.Arcade.ArcadeBodyCollision;
export const getGameWidth = (scene: Phaser.Scene) => {
    return scene.game.scale.width;
  };

export const getGameHeight = (scene: Phaser.Scene) => {
    return scene.game.scale.height;
  };
export const collidesOnAxes = (crate: Crate, item: Crate, direction: Direction): boolean => {
  const axis = direction.up || direction.down ? 'x' : 'y';
  const opaxis = direction.up || direction.down ? 'y' : 'x';
  const halfSize = crate.body.height / 2;
  // the following var names are presuming direction in y axis. Could make it more general,
  // as this function is used on the x axis too. but this is already confusing as is.
  const leftCornerItem = item[axis] - halfSize;
  const rightCornerItem = item[axis] + halfSize;
  // reminder: change halfsize into halfwidth/ height if the item is not square.
  const leftCornerCrate = crate[axis] - halfSize;
  const rightCornerCrate = crate[axis] + halfSize;
  const upLeftCondition = item[opaxis] + halfSize <= crate[opaxis] - halfSize;
  const downRightCondition = item[opaxis] - halfSize >= crate[opaxis] + halfSize;
  return item !== crate
  && (direction.up || direction.left ? upLeftCondition : downRightCondition)
  && (
    (leftCornerItem <= rightCornerCrate && leftCornerItem >= leftCornerCrate )
    || (rightCornerItem <= rightCornerCrate && rightCornerItem >= leftCornerCrate )
  );
};
export const impassable = (crate: Crate, otherCrate: Crate, speed: number, direction: Direction, world: ArcadeBodyBounds): boolean =>
    reachedBound(crate, speed, direction, world) || blockedInDirection(crate, otherCrate, speed, direction) ;

export const blockedInDirection = (crate: Crate, otherCrate: Crate, speed: number, direction: Direction): boolean => {
  if (crate.enemy) {
    return true;
  }
  if (otherCrate) {
  const halfSize = crate.body.height / 2;
  const axis = direction.up || direction.down ? 'y' : 'x';
  const upLeftCondition = otherCrate[axis] + halfSize >= crate[axis] - halfSize - speed;
  const downRightCondition = otherCrate[axis]  - halfSize <= crate[axis] + halfSize + speed;
  return direction.up || direction.left ? upLeftCondition : downRightCondition;
  } else {
    return false;
  }
 };

export const reachedBound = (crate: Crate, speed: number, direction: Direction, world: ArcadeBodyBounds): boolean => {
    const halfSize = crate.body.height / 2;
    const axis = direction.up || direction.down ? 'y' : 'x';
    const d2str = direction.left ? 'left' : direction.right ? 'right' : direction.up ? 'top' : direction.down ? 'bottom' : 'none';

    const upleft = world[d2str] >= crate[axis] - halfSize;
    const downright = world[d2str] <= crate[axis] + halfSize;
    return direction.up || direction.left ? upleft : downright;
};

export function lineIntersect(p1: PMath.Vector2, p2: PMath.Vector2, p3: PMath.Vector2, p4: PMath.Vector2) {
    const denom = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
    if (denom === 0) {
        return null;
    }
    const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denom;
    // const ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denom;
    return new PMath.Vector2({
        x: p1.x + ua * (p2.x - p1.x),
        y: p1.y + ua * (p2.y - p1.y),
        // seg1: ua >= 0 && ua <= 1,
        // seg2: ub >= 0 && ub <= 1,
    });
}
const varToString = (varObj: object) => Object.keys(varObj)[0];
export function addProperty(object: object, val: object) {
    const name = varToString(val);
    object[name] = Object.values(val)[0];
    return object;
}

export function calcDistance(foo: PMath.Vector2, bar: PMath.Vector2) {
    const a = foo.x - bar.x;
    const b = foo.y - bar.y;
    return Math.hypot( a, b);
}
