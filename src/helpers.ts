import {Physics, Types, Math as PMath, Geom} from 'phaser';

import Crate from './gameobjects/Crate';
import ArcadeBodyBounds = Phaser.Types.Physics.Arcade.ArcadeBodyBounds;
import Wall from './gameobjects/Wall';
import Vector2 = Phaser.Math.Vector2;
import ArcadeBodyCollision = Phaser.Types.Physics.Arcade.ArcadeBodyCollision;
import Path = Phaser.Curves.Path;
import RadToDeg = Phaser.Math.RadToDeg;
import FACING_UP = Phaser.Physics.Arcade.FACING_UP;
import FACING_DOWN = Phaser.Physics.Arcade.FACING_DOWN;
import FACING_LEFT = Phaser.Physics.Arcade.FACING_LEFT;
import FACING_RIGHT = Phaser.Physics.Arcade.FACING_RIGHT;
import FACING_NONE = Phaser.Physics.Arcade.FACING_NONE;
import { Point } from './plugins/navmesh/src/common-types';
// import Between = Phaser.Math.Between;

export interface ShapeCollectionItem {
    type: number;
    color?: number | undefined;
    strokeColor?: number | undefined;
    lineWidth?: number | undefined;
    shape: object;
}

export enum Direction {
    none = FACING_NONE,
    up = FACING_UP,
    down = FACING_DOWN,
    left = FACING_LEFT,
    right = FACING_RIGHT,
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

export function setPosition(target: Point, position: Point) {
    target.x = position.x;
    target.y = position.y;
}

export const CreateShape = (scene) => {
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
                .startAt(left + radius, top)
                // .arc(right - radius, top + radius, radius, 270, 360)
                // right line, bottom arc
                // .lineTo(right, boxBottom - radius)
                // .arc(right - radius, boxBottom - radius, radius, 0, 90)
                // .lineTo(left + radius, boxBottom)
                .arc(left + radius, boxBottom - radius, radius, 60, 180)
                // // left line, top arc
                // .lineTo(left, top + radius)
                .arc(left + radius, top + radius, radius, 180, 300)
                // .lineTo(left, top + radius)

                .close();
        },
    });
};
export function getArcCurve({x, y, radius, startAngle, endAngle}) {
    const path = new Path();
    path.moveTo(x, y);
    path.ellipseTo(radius, radius, RadToDeg(startAngle), RadToDeg(endAngle));
    path.closePath();
    return path;
}
export const getArcShape = (position, radius, hl1, hl2, direction) => ({ x: position.x, y: position.y, radius, startAngle: direction + hl1 % Math.PI, endAngle: direction - hl2 % Math.PI });
export const unblockBut = (direction, items) => Object.entries(items).forEach((item) => {
    if (item[0] !== direction) {
        items[item[0]] = false;
    }
});

export const getRandomInt = (max) => Math.floor(Math.random() * max);

export function getHomoTheticCenter(circle1: Geom.Circle, circle2: Geom.Circle,) {
    if (circle1.radius === circle2.radius) {
        throw new Error('Circles must have different radii');
    }
    const extendLineBy = circle1.radius;
    const ext = new Geom.Line(circle1.x, circle1.y, circle2.x, circle2.y);
    const crossb = Phaser.Geom.Line.Extend(ext, 0, extendLineBy);
    const cp = point2Vec(circle1.getPoint(0));
    const cp2 = point2Vec(circle2.getPoint(0));
    const crossa = Phaser.Geom.Line.Extend(new Geom.Line(cp.x, cp.y, cp2.x, cp2.y), extendLineBy);
    const result = lineIntersect(crossb.getPointA(), crossb.getPointB(), crossa.getPointA(), crossa.getPointB());

    return result
}


export function findTangents({x, y, radius}:Geom.Circle, point: Vector2) {
    if (point){
        const dx = x - point.x;
        const dy = y - point.y;
        const dd = Math.sqrt(dx * dx + dy * dy);
        const a = Math.asin(radius / dd);
        const b = Math.atan2(dy, dx);
        
        const t = b - a
        const ta = { x:radius * Math.sin(t), y:radius * -Math.cos(t) };
        
        const t2 = b + a
        const tb = { x:radius * -Math.sin(t2), y:radius * Math.cos(t2) };
        const p1 = new Vector2(x + ta.x, y + ta.y);
        const p2 = new Vector2(x + tb.x, y + tb.y);
        return [p1, p2];
    }
    return [];
}
// function to get the perpedicular vector of a line
export function getPerpendicular(line: Geom.Line) {
    // get a direction vector between the two points
    const dir = new Vector2(line.getPointB().x - line.getPointA().x, line.getPointB().y - line.getPointA().y);
    const v1 = point2Vec(line.getPointA());
    const v2 = point2Vec(line.getPointB());
    // convert the line to a normalized unit vector
    const b = (v2.clone().subtract(v1)).normalize();
    const p = line.getRandomPoint();
    const lamda = point2Vec(p).subtract(v1).dot(b);
    return b.scale(lamda).add(v1);
}
// functiont to get the inner homothetic center between two circles
export function getInnerHomoTheticCenter(circle1: Geom.Circle, circle2: Geom.Circle) {
    // get a directional vector between the two circles
    

    // Get the perpedicular vector.
    const v = getPerpendicular(new Geom.Line(circle1.x, circle1.y, circle2.x, circle2.y));
    // get point on the first circle
    const p1 = circle1.getPoint(0);
    // get point on the second circle
    const p2 = circle2.getPoint(0);
    
    // Calculate inner homothetic center.
    const a = v.length();
    const b = circle1.radius;
    const c = circle2.radius;
    const d = 2 * (v.x * (p1.x - p2.x) + v.y * (p1.y - p2.y));
    const e = Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2) - Math.pow(c, 2) + Math.pow(b, 2);
    const f = Math.pow(e, 2) - 4 * d * (Math.pow(b, 2) - Math.pow(c, 2));
    if (f < 0) {
        return null;
    }
    const x = (e - Math.sqrt(f)) / (2 * d);
    const y = (e + Math.sqrt(f)) / (2 * d);
    const center1 = new Vector2(p1.x + x * (p2.x - p1.x), p1.y + x * (p2.y - p1.y));

    // Calculate outer homothetic center.
    // if (circle1.radius !== circle2.radius) {
        
    // }

    return center1;
}

export function findExternalTangents(circle1: Geom.Circle, circle2: Geom.Circle, homoTheticCenter: Vector2 | null) {
    if (homoTheticCenter) {
        const [p2, p1] = findTangents(circle1, homoTheticCenter);
        const [p3, p4] = findTangents(circle2, homoTheticCenter);
        return [p1, p2, p3, p4];
    }
    return [];
}
 
 function angleBetween(obj1, obj2) {
    // angle in radians
    var angleRadians = Math.atan2(obj2.y - obj1.y, obj2.x - obj1.x);
    // angle in degrees
    var angleDeg = (Math.atan2(obj2.y - obj1.y, obj2.x - obj1.x) * 180 / Math.PI);
    return angleDeg;
}

export const getTriangle = (p1, p2, p3) => new Geom.Triangle(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
// function that finds the angle between two circles
export function getAngle(circle1: Geom.Circle, circle2: Geom.Circle) {
    const v1 = point2Vec(circle1.getPoint(0));
    const v2 = point2Vec(circle2.getPoint(0));
    const v3 = v2.clone().subtract(v1);
    // const angle = Math.atan2(v3.y, v3.x);
    // const angle = 
    const norm = Phaser.Math.Angle.Normalize(Phaser.Math. Angle.BetweenPoints(v1, v2)) / Math.PI * 2;
    // const relativeAngle  = Normalize(BetweenPoints(vanishPoint, point)) / all;

    console.log('angle', norm);
    return norm;
}

//function that finds the homothetic center of two circles
export function getHomoTheticCenterAngle(circle1: Geom.Circle, circle2: Geom.Circle) {
    const angle = Phaser.Math.Angle.Normalize(Phaser.Math.Angle.BetweenPoints(circle1, circle2));

    const percentage = angle / (Math.PI * 2);
    console.log('percentage', percentage);
    const v1 = point2Vec(circle1.getPoint(0));
    const v2 = point2Vec(circle2.getPoint(0));
    const v3 = v1.clone().subtract(v2);
    const v4 = v3.clone().rotate(angle);
    const v5 = v4.clone().add(v2);
    return v5;
}

// Check if rectangle a contains rectangle b
// Each object (a and b) should have 2 properties to represent the
// top-left corner (x1, y1) and 2 for the bottom-right corner (x2, y2).
export function contains(a, b) {
	return !(
		b.x1 < a.x1 ||
		b.y1 < a.y1 ||
		b.x2 > a.x2 ||
		b.y2 > a.y2
	);
}

// Check if rectangle a overlaps rectangle b
// Each object (a and b) should have 2 properties to represent the
// top-left corner (x1, y1) and 2 for the bottom-right corner (x2, y2).
export function overlaps(a, b) {
	// no horizontal overlap
	if (a.x1 >= b.x2 || b.x1 >= a.x2) return false;

	// no vertical overlap
	if (a.y1 >= b.y2 || b.y1 >= a.y2) return false;

	return true;
}

// Check if rectangle a touches rectangle b
// Each object (a and b) should have 2 properties to represent the
// top-left corner (x1, y1) and 2 for the bottom-right corner (x2, y2).
export function touches(a, b) {
	// has horizontal gap
	if (a.x1 > b.x2 || b.x1 > a.x2) return false;

	// has vertical gap
	if (a.y1 > b.y2 || b.y1 > a.y2) return false;

	return true;
}

type XY = 0|1;
export const overlap = ([topLeft, bottomRight], [topLeft2, bottomRight2], xy: XY = 0) =>
    !(topLeft[xy] >= bottomRight2[xy] || topLeft2[xy] >= bottomRight[xy]);
