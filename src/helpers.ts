import {Math as PMath, Geom} from 'phaser';

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
import Normalize = Phaser.Math.Angle.Normalize;
import Polygon from './plugins/gpc';
import decompose from 'rectangle-decomposition';
import GameObject = Phaser.GameObjects.GameObject;
import Rectangle = Phaser.Geom.Rectangle;
import RectangleToRectangle = Phaser.Geom.Intersects.RectangleToRectangle;

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
export const collidesOnAxes = (crate: Crate, item: Crate, direction: ArcadeBodyCollision, max: number): boolean => {
    const extended = new Rectangle(direction.left ? 0 : crate.body.left, direction.up ? 0 : crate.body.top, direction.right ? max : direction.left ? crate.body.right : crate.body.width, direction.down ? max : direction.up ? crate.body.bottom : crate.body.height);
    const collides = new Rectangle(item.body.left, item.body.top, item.body.width, item.body.height);
    return RectangleToRectangle(extended, collides);
};
export const Collision4Direction = (dir: Direction) => ({none: dir === Direction.none, up: dir === Direction.up, down: dir === Direction.down, left: dir === Direction.left, right: dir === Direction.right });
export const impassable = (crate: Crate, otherCrate: Crate | undefined, speed: number, direction: ArcadeBodyCollision, world: ArcadeBodyBounds): boolean =>
    reachedBound(crate, speed, direction, world) || blockedInDirection(crate, otherCrate, speed, direction) || crate instanceof Wall;

export const blockedInDirection = (crate: Crate, otherCrate: Crate | undefined, speed: number, direction: ArcadeBodyCollision): boolean => {
  if (crate.enemy) {
    return true;
  }
  if (otherCrate) {
      const box = new Rectangle(crate.body.left - speed, crate.body.top - speed, crate.body.width + speed, crate.body.height + speed);
      const otherBox = new Rectangle(otherCrate.body.left - speed, otherCrate.body.top - speed, otherCrate.body.width + speed, otherCrate.body.height + speed);
      return RectangleToRectangle(box, otherBox);
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
            const left = 0,
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
    const circle = new Geom.Circle(x, y, radius);
    const perc =  Normalize(startAngle) / (Math.PI * 2) % 1;
    const point = circle.getPoint(Math.abs(perc));

    const path = new Path();
    path.moveTo(point.x, point.y);
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

export function getHomoTheticCenter(circle1: Geom.Circle, circle2: Geom.Circle) {
    if (circle1.radius === circle2.radius) {
        throw new Error('Circles must have different radii');
    }
    const extendLineBy = circle1.radius;
    const ext = new Geom.Line(circle1.x, circle1.y, circle2.x, circle2.y);
    const crossb = Phaser.Geom.Line.Extend(ext, 0, extendLineBy);
    const cp = point2Vec(circle1.getPoint(0));
    const cp2 = point2Vec(circle2.getPoint(0));
    const crossa = Phaser.Geom.Line.Extend(new Geom.Line(cp.x, cp.y, cp2.x, cp2.y), extendLineBy);
    return lineIntersect(crossb.getPointA(), crossb.getPointB(), crossa.getPointA(), crossa.getPointB());
}

export function findTangents({x, y, radius}: Geom.Circle, point: Vector2) {
    if (point) {
        const dx = x - point.x;
        const dy = y - point.y;
        const dd = Math.sqrt(dx * dx + dy * dy);
        const a = Math.asin(radius / dd);
        const b = Math.atan2(dy, dx);

        const t = b - a;
        const ta = { x: radius * Math.sin(t), y: radius * -Math.cos(t) };

        const t2 = b + a;
        const tb = { x: radius * -Math.sin(t2), y: radius * Math.cos(t2) };
        const p1 = new Vector2(x + ta.x, y + ta.y);
        const p2 = new Vector2(x + tb.x, y + tb.y);
        return [p1, p2];
    }
    return [];
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
    const angleRadians = Math.atan2(obj2.y - obj1.y, obj2.x - obj1.x);
    // angle in degrees
    return (Math.atan2(obj2.y - obj1.y, obj2.x - obj1.x) * 180 / Math.PI);
}

export const getTriangle = (p1, p2, p3) => new Geom.Triangle(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
// function that finds the angle between two circles
export function getAngle(circle1: Geom.Circle, circle2: Geom.Circle) {
    const v1 = point2Vec(circle1.getPoint(0));
    const v2 = point2Vec(circle2.getPoint(0));
    return Phaser.Math.Angle.Normalize(Phaser.Math. Angle.BetweenPoints(v1, v2)) / Math.PI * 2;
}

export const mapPointsToArray = ({x, y}) => [x, y];

export function getNavMesh(crates, worldbounds, div) {
    const {left, top, bottom, right} = worldbounds;
    const holeCubes: Point[][] = [];

    crates.children.iterate((crate: Crate) => {
        const crateBody = ((crate as unknown as GameObject).body as Phaser.Physics.Arcade.Body);
        // const div = body.width / 2;
        const w = (crateBody.width / 2) + div;
        const h = (crateBody.height / 2) + div;
        const {x, y} = crate as unknown as Point;

        const leftX = x - w;
        const topY = y - h;
        const rightX = x + w;
        const bottomY = y + h;

        const points: Point[] = [{x: leftX, y: topY}, {x: leftX, y: bottomY}, {x: rightX, y: bottomY}, {x: rightX, y: topY}];
        holeCubes.push(points);
    });
    const region: Point[] = [{x: left, y: top}, {x: right, y: top}, {x: right, y: bottom}, {x: left, y: bottom}];
    const worldbox = Polygon.fromPoints(region);
    const {bounds: inbounds} = worldbox.toVertices();
    const crateRegions: number[][][] = [];
    const {bounds, holes} = Polygon.fromVertices({bounds: inbounds, holes: holeCubes}).toVertices();

    holes.forEach((hole) => crateRegions.push(hole.map(mapPointsToArray)));
    bounds.forEach((bound) => crateRegions.push(bound.map(mapPointsToArray)));

    const partitioned = decompose(crateRegions);
    return partitioned.map ((decomp) => {
            const topLeft = new Vector2(decomp[0][0], decomp[0][1]);
            const bottomRight = new Vector2(decomp[1][0], decomp[1][1]);
            return [
                { x: topLeft.x, y: topLeft.y },
                { x: bottomRight.x, y: topLeft.y },
                { x: bottomRight.x, y: bottomRight.y },
                { x: topLeft.x, y: bottomRight.y },
            ];
        },
    );
}
