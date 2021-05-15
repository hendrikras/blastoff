import {Physics, Types, Math as PMath} from 'phaser';
import Crate from './gameobjects/Crate';
import ArcadeBodyBounds = Phaser.Types.Physics.Arcade.ArcadeBodyBounds;
import Wall from './gameobjects/Wall';
import Vector2 = Phaser.Math.Vector2;
import ArcadeBodyCollision = Phaser.Types.Physics.Arcade.ArcadeBodyCollision;

export enum Direction {
    none,
    up,
    down,
    left,
    right,
}
export const getGameWidth = (scene: Phaser.Scene) => {
    return scene.game.scale.width;
  };

export const getGameHeight = (scene: Phaser.Scene) => {
    return scene.game.scale.height;
  };
export const collidesOnAxes = (crate: Crate, item: Crate, direction: ArcadeBodyCollision): boolean => {
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
export const Collision4Direction = (dir: Direction) => ({none: dir === Direction.none, up: dir === Direction.up, down: dir === Direction.down, left: dir === Direction.left, right: dir === Direction.right });
export const impassable = (crate: Crate, otherCrate: Crate | undefined, speed: number, direction: ArcadeBodyCollision, world: ArcadeBodyBounds): boolean =>
    reachedBound(crate, speed, direction, world) || blockedInDirection(crate, otherCrate, speed, direction) || crate instanceof Wall;

export const blockedInDirection = (crate: Crate, otherCrate: Crate | undefined, speed: number, direction: ArcadeBodyCollision): boolean => {
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

export const reachedBound = (crate: Crate, speed: number, direction: ArcadeBodyCollision, world: ArcadeBodyBounds): boolean => {
    const halfSize = crate.body.height / 2;
    const axis = direction.up || direction.down ? 'y' : 'x';
    const d2str = direction.left ? 'left' : direction.right ? 'right' : direction.up ? 'top' : direction.down ? 'bottom' : 'none';

    const upleft = world[d2str] >= crate[axis] - halfSize;
    const downright = world[d2str] <= crate[axis] + halfSize;
    return direction.up || direction.left ? upleft : downright;
};

export function lineIntersect(p1: PMath.Vector2, p2: PMath.Vector2, p3: PMath.Vector2, p4: PMath.Vector2): Vector2 | null {
    const denom = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
    if (denom === 0) {
        return null;
    }
    const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denom;
    return new PMath.Vector2({
        x: p1.x + ua * (p2.x - p1.x),
        y: p1.y + ua * (p2.y - p1.y),
    });
}
const varToString = (varObj: object) => Object.keys(varObj)[0];
export function addProperty(object: object, val: object) {
    const name = varToString(val);
    object[name] = Object.values(val)[0];
    return object;
}

export function gcd(x, y) {
    const cb = (a, b) => (b === 0 ? a : cb(b, a % b));
    return cb(Math.abs(x), Math.abs(y));
}
export const pyt = (d, rad) => Math.sqrt(rad ** 2 - d ** 2); // use the Pythagorean Theorem to get the new radius length\

export const point2Vec = (({x, y}) => new Vector2(x, y));

export type Constructor<T = {}> = new (...args: any[]) => T;

export function calculateCircleCenter(A, B, C) {
    const yDeltaA = B.y - A.y;
    const xDeltaA = B.x - A.x;
    const yDeltaB = C.y - B.y;
    const xDeltaB = C.x - B.x;

    const aSlope = yDeltaA / xDeltaA;
    const bSlope = yDeltaB / xDeltaB;

    const x = (aSlope * bSlope * (A.y - C.y) + bSlope * (A.x + B.x) - aSlope * (B.x + C.x) ) / (2 * (bSlope - aSlope) );
    const y = -1 * (x - (A.x + B.x) / 2) / aSlope +  (A.y + B.y) / 2;
    return new Vector2(x, y);

}

export const getVector = (cx, cy, a, r) => new Vector2(cx + r * Math.cos(a), cy + r * Math.sin(a));
export const angle = (c1, c2) => Math.atan2(c1.y - c2.y, c1.x - c2.x);
interface HasPos {
    x: number;
    y: number;
}
export function setPosition(target: HasPos, position: HasPos) {
    target.x = position.x;
    target.y = position.y;
}

export const CreateBubbleShape = (scene) => {
    return scene.add.rexCustomShapes({
        type: 'SpeechBubble',
        create: { lines: 1 },
        update: function() {
            const radius = 20;
            const strokeColor = this.getData('strokeColor');
            const fillColor = this.getData('fillColor');

            // tslint:disable-next-line:one-variable-per-declaration
            const left = 0, right = this.width,
                top = 0, bottom = this.height, boxBottom = bottom;
            this.getShapes()[0]
                .lineStyle(2, strokeColor, 1)
                .fillStyle(fillColor, 1)
                // top line, right arc
                .startAt(left + radius, top).lineTo(right - radius, top)
                .arc(right - radius, top + radius, radius, 270, 360)
                // right line, bottom arc
                .lineTo(right, boxBottom - radius)
                .arc(right - radius, boxBottom - radius, radius, 0, 90)
                .lineTo(left + radius, boxBottom)
                .arc(left + radius, boxBottom - radius, radius, 90, 180)
                // // left line, top arc
                .lineTo(left, top + radius)
                .arc(left + radius, top + radius, radius, 180, 270)
                .close();
        },
    });
};

export const getArcShape = (position, radius, hl1, hl2, direction) => ({ x: position.x, y: position.y, radius, startAngle: direction + hl1 % Math.PI, endAngle: direction - hl2 % Math.PI });
export const unblockBut = (direction, items) => Object.entries(items).forEach((item) => {
    if (item[0] !== direction) {
        items[item[0]] = false;
    }
});
