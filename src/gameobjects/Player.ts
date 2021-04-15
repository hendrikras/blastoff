import { Physics, Types } from 'phaser';
import {collidesOnAxes, impassable, lineIntersect, point2Vec, pyt} from '../helpers';

import Crate from './Crate';
import CollidesWithObjects from './CollidesWithObjects';
import ArcadeBodyBounds = Phaser.Types.Physics.Arcade.ArcadeBodyBounds;
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite';
import PerspectiveMixin, {PerspectiveMixinType} from './PerspectiveMixin';
import Circle = Phaser.Geom.Circle;
import CubicBezier = Phaser.Curves.CubicBezier;
import Vector2 = Phaser.Math.Vector2;
import BetweenPoints = Phaser.Math.Angle.BetweenPoints;
import Normalize = Phaser.Math.Angle.Normalize;
import QuadraticBezier = Phaser.Curves.QuadraticBezier;
import RadToDeg = Phaser.Math.RadToDeg;
import Line = Phaser.Geom.Line;
import DegToRad = Phaser.Math.DegToRad;

import PerspectiveObject from '../gameobjects/PerspectiveMixin';
import SphereClass from './Sphere';
import CIRCLE = Phaser.Geom.CIRCLE;
import LINE = Phaser.Geom.LINE;
import ELLIPSE = Phaser.Geom.ELLIPSE;

interface ShapeCollectionItem {
    type: number;
    color: number;
    shape: object;
}
export default class Player extends CollidesWithObjects {
    private speed;
    private hasInput: boolean;
    private cursorKeys: Types.Input.Keyboard.CursorKeys;
    private pace: number = 30;
    private crates: Crate[];
    private factor: number = (this.pace / 10) * 2.5;
    private worldBounds: ArcadeBodyBounds;

    private center: Circle;
    private shadow: Circle;
    private color: number;
    private size: number;
    private torso;
    private pathHelper: Circle;
    private head: SphereClass;

    private dist: number;

    constructor(config, gridUnit: number, crates: Physics.Arcade.Group, size, scale) {
        super(config.scene, config.x, config.y, size, size);
        const that = this as ContainerLite;
        const {x, y} = config;
        this.color = 0X0B6382;
        const shadowColor = 0X031920;
        this.size = size;
        this.shadow = config.scene.add.circle(x, y, size * 0.85, shadowColor, 0.4);
        this.center = new Circle(x, y, size * 1.2);
        this.pathHelper = new Circle(x, y, size);

        that.setScale(scale, scale);

        that.body.setCollideWorldBounds(true);

        const Sphere = PerspectiveObject(SphereClass);
        const quarter = size * 2;
        // @ts-ignore;
        this.head = new Sphere(config.scene, x, y, quarter, quarter, quarter,  this.color);
        this.head.setDepth(2);
        this.crates = crates.children.getArray() as Crate[];
        this.speed = gridUnit * this.pace;
        this.gridUnit = gridUnit / 10;
        this.cursorKeys = config.scene.input.keyboard.createCursorKeys();
        this.pushCrate = this.pushCrateImpl;
        this.worldBounds = config.scene.physics.world.bounds;
    }

    public isMoving() {
        return this.hasInput;
    }

    public resetPlayerOnCrate() {
      if (this.pushedCrate && this.pushedCrate.player) {
        this.pushedCrate.player = false;
        // if (this.pushedCrate.enemy)  this.pushedCrate.enemy.chasePlayer = true;
        this.pushedCrate.enemy = null;
      }
      this.pushedCrate = null;
    }

    public update() {
        const that = this as ContainerLite;
        that.graphics.clear();
        that.graphics.lineStyle();
        const osbscuredShapes: ShapeCollectionItem[] = [];
        const unubscuredShapes: ShapeCollectionItem[] = [];
        const { scene } = that;
        const {physics: {world: {bounds: {height, width, centerX, centerY}}}} = scene;

        that.setChildPosition(this.pathHelper, that.x, that.y);
        that.setChildPosition(this.head, that.x, that.y);
        that.predraw();
        const { vertices: v, x, y, graphics, point, centerBottom, centerCenter, vanishPoint, pastCenter} = this as unknown as PerspectiveMixinType;
        that.setChildPosition(this.center, centerCenter.x, centerCenter.y);
        const faceFeatColor = 0x16D8D8;
        this.head.update();
        const { equator, pi2: all} = this.head as unknown as SphereClass;
        const {curve: eyeLine, isObscured} = this.head.getSlice('x', 0.5);

        if (centerBottom) {
            that.setChildPosition(this.shadow, centerBottom.x, centerBottom.y);

            const direction = Normalize(that.body.angle) / all;
            const facingDirectionPoint = new Vector2(Circle.GetPoint(this.pathHelper, direction));

            const relativeAngle  = Normalize(BetweenPoints(vanishPoint, point)) / all;

            const rightShoulder = (direction + 0.25) % 1;
            const leftShoulder =  (direction + 0.75) % 1;

            const facingCenter = 0.25;
            const mirrorA = (facingCenter + 0.5) % 1;
            const shoulder1Point = equator.getPoint(relativeAngle - direction - 0.25 % 1);
            const shoulder2Point = equator.getPoint(relativeAngle - direction - 0.75 % 1);
            const hand1 = new Vector2(Circle.GetPoint(this.center, rightShoulder));
            const hand2 = new Vector2(Circle.GetPoint(this.center, leftShoulder));

            const p1 = equator.getPoint(facingCenter);
            const p2 = equator.getPoint(mirrorA);
            const p3 = equator.getPoint(facingCenter).lerp(vanishPoint, 0.08);
            const p4 = equator.getPoint(mirrorA).lerp(vanishPoint, 0.08);
            graphics.fillStyle(this.color);
            const type = CIRCLE;
            const handColor = 0X2405B;
            const hand1Shape = {type, shape: new Circle(hand1.x, hand1.y, this.gridUnit / 1.5), color: handColor};
            const hand2Shape = {type, shape: new Circle(hand2.x, hand2.y, this.gridUnit / 1.5), color: handColor};
            this.torso = new CubicBezier(p1, p3, p4, p2);
            this.torso.draw(graphics);
            graphics.fillStyle(this.color, 1);
            graphics.fillPath();
            const nose = relativeAngle - direction;
            const eye1Angle = nose - 0.95 % 1;
            const eye2Angle = nose - 0.05 % 1;
            const eye1 = eyeLine.getPoint(eye1Angle);
            const eye2 = eyeLine.getPoint(eye2Angle);
            const faceFeatColor = 0x16D8D8;
            const arm1 = {type: LINE,  shape: new Line(shoulder1Point.x, shoulder1Point.y, hand1.x, hand1.y), color: 0x000};
            const arm2 = {type: LINE,  shape: new Line(shoulder2Point.x, shoulder2Point.y, hand2.x, hand2.y), color: 0x000};
            let mouth2 = equator.getPoint(eye2Angle);
            let mouth1 = equator.getPoint(eye1Angle);

            const nosePoint = equator.getPoint(nose);
            const noseObscured = isObscured(nosePoint);
            const mouth1Obscured = isObscured(mouth1);
            const mouth2Obscured = isObscured(mouth2);
            if (mouth1Obscured && !noseObscured) {
               mouth1 = mouth1.distance(mouth1Obscured[0]) < mouth1.distance(mouth1Obscured[1]) ? mouth1Obscured[0] : mouth1Obscured[1];
            }
            if (mouth2Obscured && !noseObscured) {
                mouth2 = mouth2.distance(mouth2Obscured[0]) < mouth1.distance(mouth2Obscured[1]) ? mouth2Obscured[0] : mouth2Obscured[1];
            }
            if (!noseObscured) {
                const shape = new QuadraticBezier(mouth1, nosePoint, mouth2);
                unubscuredShapes.push({type: -2, shape, color: 0x00});
            }

            if (this.head.isObscured(shoulder1Point)) {
                osbscuredShapes.push(arm1);
                osbscuredShapes.push(hand1Shape);
            } else {
                unubscuredShapes.push(arm1);
                unubscuredShapes.push(hand1Shape);
            }
            if (this.head.isObscured(shoulder2Point)) {
                osbscuredShapes.push(arm2);
                osbscuredShapes.push(hand2Shape);
            } else {
                unubscuredShapes.push(arm2);
                unubscuredShapes.push(hand2Shape);
            }

            graphics.fillStyle(faceFeatColor);

            const wh = this.gridUnit / 2.5;

            if (isObscured(eye1)) {
                const shape = new Circle(eye1.x, eye1.y, wh);
                osbscuredShapes.push({type, shape, color: faceFeatColor});
            } else {
                const shape = this.getEyeShape(eye1, wh);
                unubscuredShapes.push({type: -1, shape, color: faceFeatColor});
            }
            if (isObscured(eye2)) {
                const shape = new Circle(eye2.x, eye2.y, wh);
                osbscuredShapes.push({type, shape, color: faceFeatColor});
            } else {
                const shape = this.getEyeShape(eye2, wh);
                unubscuredShapes.push({type: -1, shape, color: faceFeatColor});
            }

            this.drawShapes(osbscuredShapes);
            graphics.fillStyle(this.color, 1);
            graphics.fillCircleShape(this.head.shape);
            graphics.fillStyle(faceFeatColor, 1);
            this.drawShapes(unubscuredShapes);
            graphics.lineStyle(0, 0);

        }

      // re-enable moving in a certain direction if passed a blockade
        this.resetBlockedDirections();

        // Every frame, we create a new velocity for the sprite based on what keys the player is holding down.
        const velocity = new Phaser.Math.Vector2(0, 0);
        // @ts-ignore
        const { left: { isDown: leftDown}, right: { isDown: rightDown}, up: { isDown: upDown}, down: {isDown: downDown}} = this.cursorKeys;
        if (leftDown && !this.blockedDirection.left) {

            velocity.x -= 1;
            this.hasInput = true;
            this.blockedDirection.right = false;
        }
        if (rightDown && !this.blockedDirection.right)  {
            velocity.x += 1;
            this.hasInput = true;
            this.blockedDirection.left = false;

        }
        if (upDown && !this.blockedDirection.up) {
          velocity.y -= 1;
          this.hasInput = true;
          this.blockedDirection.down = false;
        }
        if (downDown && !this.blockedDirection.down) {
            velocity.y += 1;
            this.hasInput = true;
            this.blockedDirection.up = false;
        }

        // We normalize the velocity so that the player is always moving at the same speed, regardless of direction.
        const normalizedVelocity = velocity.normalize();
        (this as any).body.setVelocity(normalizedVelocity.x * this.speed, normalizedVelocity.y * this.speed);
      }
    public crateCollider = (me: Player, crate: Crate) => {

      this.pushedCrate = crate;
      if (!crate.player) {
        crate.player = true;
      }
      this.handleCrateCollison(crate);
    }
    private getEyeShape(position, radius) {
        const { shape, pi2: all } = this.head;
        const between = Normalize(BetweenPoints(position, shape));
        const midRad = between / all;
        const dist = (position.distance(shape) / (shape.radius) - 0.5) * 2;
        const midPoint = point2Vec(shape.getPoint(midRad)).lerp(shape, dist);
        const l = new Line(midPoint.x, midPoint.y, shape.x, shape.y);
        const distance = shape.radius * (1 - dist);
        const size = pyt(distance, shape.radius);

        const ang = RadToDeg(between) + 90 % 360;
        Line.SetToAngle(l, midPoint.x, midPoint.y, DegToRad(ang), size);

        const circAng = (between / all + 0.25) % 1;
        const pointB = l.getPointB();
        const startAngle = Normalize(BetweenPoints(shape, pointB));
        const circAng2 = (circAng + 0.5) % 1;
        const reflectPoint1 = shape.getPoint(circAng);
        const reflectPoint2 = shape.getPoint(circAng2);
        const reflectingLine = new Line(reflectPoint1.x, reflectPoint1.y, reflectPoint2.x, reflectPoint2.y);
        const toCenter = new Line(pointB.x, pointB.y, shape.x, shape.y);
        const endAngle = Normalize(Line.ReflectAngle( toCenter, reflectingLine));
        return { x: position.x, y: position.y, radius, startAngle, endAngle, anticlockwise: false  };
    }
    private drawShapes(items) {

    items.forEach(({type, shape, color}) => {
            const {graphics} = this as unknown as PerspectiveMixinType;
            if (type === CIRCLE) {
                graphics.fillStyle(color, 1);
                graphics.fillCircleShape(shape);
            } else if (type === ELLIPSE) {
                graphics.fillStyle(color, 1);
                graphics.fillEllipseShape(shape);
            } else if (type === -2) {
                graphics.lineStyle(this.gridUnit / 4, color, 1);
                graphics.strokePoints(shape.getPoints());
            } else if (type === -1) {
                const {x, y, radius, startAngle, endAngle, anticlockwise} = shape;
                graphics.beginPath();
                graphics.fillStyle(color, 1);
                graphics.arc(x, y, radius, startAngle, endAngle, anticlockwise);
                graphics.fillPath();

            } else {
                graphics.lineStyle(this.gridUnit / 4, color, 1);
                graphics.strokeLineShape(shape);

            }
        });
    }
    private rotateZ3D(theta, orig) {
        const sinTheta = Math.sin(theta);
        const cosTheta = Math.cos(theta);
        const point = new Vector2(orig.x, orig.y);
        // for (var n=0; n<nodes.length; n++) {
        //     var node = nodes[n];
        //     var x = node[0];
        //     var y = node[1];
        point.x = point.x * cosTheta - point.y * sinTheta;
        point.y = point.y * cosTheta + point.x * sinTheta;
        // }
        return point;
    }
    private getMiddle(top, bottom, floorTop, floorBottom) {
        const middle = lineIntersect(top, floorBottom, bottom, floorTop);
        return middle;
    }
    private pushCrateImpl(direction: string, crate: Crate) {
        this.setCollidedObject(crate);
        const up = direction === 'up';
        const down = direction === 'down';
        const right = direction === 'right';
        const left = direction === 'left';
        const none = false;
        const collision: Types.Physics.Arcade.ArcadeBodyCollision = { up, down, right, left, none };
        const axis = up || down ? 'y' : 'x';
        const selection: Crate[] = this.crates.filter((item: Crate) => collidesOnAxes(crate, item, collision))
            .sort((a: Crate, b: Crate) => a[axis] < b[axis] ? -1 : 1 );
        const collidingCrate = up || left ? selection.pop() : selection[0];

        // @ts-ignore
        if (impassable(crate, collidingCrate, this.factor, collision, this.worldBounds)) {
            this.blockedDirection = { up, down, right, left, none: false};
            const opAxis = right || left ? 'y' : 'x';
            this[`${opAxis}Threshold`] = crate[opAxis] / this.gridUnit;
        } else {
            up || left ? crate[axis] -= this.factor : crate[axis] += this.factor;
        }
        crate.update();
    }
}
