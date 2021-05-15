import {Physics, Scene, Types} from 'phaser';
import {collidesOnAxes, impassable, lineIntersect, point2Vec, pyt, setPosition} from '../helpers';

import Crate from './Crate';
import CollidesWithObjects from './CollidesWithObjects';
import ArcadeBodyBounds = Phaser.Types.Physics.Arcade.ArcadeBodyBounds;
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite';
import Circle = Phaser.Geom.Circle;
import Vector2 = Phaser.Math.Vector2;
import BetweenPoints = Phaser.Math.Angle.BetweenPoints;
import Normalize = Phaser.Math.Angle.Normalize;
import QuadraticBezier = Phaser.Curves.QuadraticBezier;
import RadToDeg = Phaser.Math.RadToDeg;
import Line = Phaser.Geom.Line;

import PerspectiveObject, {PerspectiveMixinType} from '../gameobjects/PerspectiveMixin';
import SphereClass from './Sphere';
import CIRCLE = Phaser.Geom.CIRCLE;
import LINE = Phaser.Geom.LINE;
import Path = Phaser.Curves.Path;
import ELLIPSE = Phaser.Geom.ELLIPSE;
import Ellipse = Phaser.Curves.Ellipse;
import Shape = Phaser.GameObjects.Shape;

interface ShapeCollectionItem {
    type: number;
    color: number;
    strokeColor?: number | undefined;
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
    private skirt: Shape;
    private shadow: Circle;
    private shoulderShape: Shape;
    private feetCircle: Circle;
    private shoe1: Shape;
    private shoe1Counter: number;
    private shoe2: Shape;
    private color: number;
    private size: number;
    private pathHelper: Circle;
    private head: SphereClass;
    private step: number;
    private now: number;
    private pushing: boolean;

    private scene: Scene;

    constructor(config, gridUnit: number, crates: Physics.Arcade.Group, size, scale) {
        super(config.scene, config.x, config.y, size, size);
        this.scene = config.scene;
        const that = this as ContainerLite;
        const {x, y} = config;
        this.color = 0XEFCAB7;
        const shadowColor = 0X031920;
        this.size = size;
        this.shadow = config.scene.add.circle(x, y, size, shadowColor, 0.4);
        const quarter = size * 1.8;
        const Sphere = PerspectiveObject(SphereClass);
        this.shoe1Counter = 0;
        this.step = +1;
        this.now = 0;
        // this.scale = scale;

        this.head = new Sphere(config.scene, x, y, quarter, quarter, quarter,  this.color);
        this.head.setDepth(2);
        this.head.setScale(scale);

        const shoeColor = 0xAD661F;
        const strokeStyle = [this.size / 10, 0x006400, 1];
        const shoeStyle = [this.size / 5, 0x663300, 1];
        // this.shoulderShape = config.scene.add.rexRoundRectangle(x, y, size, size * 2.5, 20, 0x09d51);
        // this.shoulderShape.setStrokeStyle(...strokeStyle);

        this.shoe1 = config.scene.add.rexRoundRectangle(x, y, size * 2, size, size / 2, shoeColor);
        this.shoe1.setStrokeStyle(...shoeStyle);
        this.shoe1.setScale(0.5);
        this.shoe2 = config.scene.add.rexRoundRectangle(x, y, size * 2, size, size / 2, shoeColor);
        this.shoe2.setScale(0.5);
        this.shoe2.setStrokeStyle(...shoeStyle);
        this.center = new Circle(x, y, size * 1.2);
        // this.skirt = config.scene.add.rexRoundRectangle(x, y, size * 1.8, size * 1.8, 20, 0x006400);
        // this.skirt = new Circle(x, y, size * 1.8);
        this.pathHelper = new Circle(x, y, size);
        this.feetCircle = new Circle(x, y, size);

        that.add(this.shadow);
        that.add(this.shoe1);
        that.add(this.shoe2);
        // that.add(this.skirt);
        // that.add(this.shoulderShape);

        // this.shoulderShape.depth = 1;
        // this.skirt.depth = 0;
        this.shoe1.depth = 0;
        this.shoe2.depth = 0;

        that.body.setCollideWorldBounds(true);

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
        this.hasInput = false;
        const that = this as ContainerLite;
        that.graphics.clear();
        that.graphics.lineStyle();
        const obscuredShapes: ShapeCollectionItem[] = [];
        const unubscuredShapes: ShapeCollectionItem[] = [];

        // that.setChildPosition(this.pathHelper, that.x, that.y);
        // that.setChildPosition(this.head, that.x, that.y);

        that.predraw();
        const { vertices: v, x, y, dp, graphics, point, centerBottom, centerCenter, vanishPoint, pastCenter} = this as unknown as PerspectiveMixinType;
        setPosition(this.pathHelper, that);
        setPosition(this.head, that);
        setPosition(this.center, centerCenter);
        setPosition(this.feetCircle, centerBottom);
        this.head.update();
        const { equator, pi2: all} = this.head as unknown as SphereClass;
        const {curve: eyeTopLine} = this.head.getSlice('x', 0.8);
        const {curve: eyeCenterLine, isObscured} = this.head.getSlice('x', 0.65);
        const {curve: eyeBottomLine} = this.head.getSlice('x', 0.4);
        that.setChildPosition(this.shadow, centerBottom.x, centerBottom.y);
        that.shadow.depth = 0;
        this.shoe1.depth = 0;
        this.shoe2.depth = 0;
        // this.skirt.depth = 0;
        // this.shoulderShape.depth = 1;
        graphics.setDepth(2);

        const shoulderpos = (this.head as unknown as PerspectiveMixinType).centerCenter;
        // that.setChildPosition(this.shoulderShape, shoulderpos.x, shoulderpos.y);
        // that.setChildPosition(this.skirt, this.center.x, this.center.y);

        const direction = Normalize(that.body.angle) / all;

        const relativeAngle  = Normalize(BetweenPoints(vanishPoint, point)) / all;
        // that.setChildRotation(this.shoulderShape, that.body.angle);
        that.setChildRotation(this.shoe1, that.body.angle);
        that.setChildRotation(this.shoe2, that.body.angle);
        // that.setChildRotation(this.skirt, that.body.angle);

        const rightShoulder = (direction + 0.25) % 1;
        const leftShoulder =  (direction + 0.75) % 1;

        const shoulder1Point = equator.getPoint(relativeAngle - direction - 0.25 % 1);
        const shoulder2Point = equator.getPoint(relativeAngle - direction - 0.75 % 1);
        const hand1 = new Vector2(Circle.GetPoint(this.center, rightShoulder));
        const hand2 = new Vector2(Circle.GetPoint(this.center, leftShoulder));


        graphics.fillStyle(this.color);
        const type = CIRCLE;
        const handColor = 0X2405B;
        // const hand1Shape = {type, shape: new Circle(hand1.x, hand1.y, this.gridUnit / 1.5), color: handColor};
        // const hand2Shape = {type, shape: new Circle(hand2.x, hand2.y, this.gridUnit / 1.5), color: handColor};
        // console.log(this.gridUnit, this.size * 0.38465);
        graphics.fillStyle(this.color, 1);
        graphics.fillPath();
        const nose = relativeAngle - direction;
        const eye1Angle = nose - 0.94 % 1;
        const eye2Angle = nose + 0.94 % 1;
        const cheek1 = nose - 0.12 % 1;
        const cheek2 = nose + 0.12 % 1;
        const faceFeatColor = 0xFFFFFF;

        // dp(shoulder1Point);
        // dp(hand2)
        const eye1Bottom = eyeBottomLine.getPoint(eye1Angle);
        const eye2Bottom = eyeBottomLine.getPoint(eye2Angle);
        const eyeTop = eyeTopLine.getPoint(eye1Angle);
        const eyeTop2 = eyeTopLine.getPoint(eye2Angle);
        const eye1Center = eyeCenterLine.getPoint(eye1Angle);
        const eye2Center = eyeCenterLine.getPoint(eye2Angle);

        const nosePoint = eyeBottomLine.getPoint(nose);
        const mouthPoint = equator.getPoint(nose).lerp(nosePoint, 0.4);
        const eye1Rotation = RadToDeg(BetweenPoints(eyeTop, eye1Center)) + 90 % 360;
        const eye1Distance = eyeTop.distance(eye1Bottom);

        const eye1 = new Ellipse( eye1Center.x, eye1Center.y, this.gridUnit / 2,  eye1Distance / 3, 0, 360, true, eye1Rotation);
        const eye1Iris = new Ellipse( eye1Center.x, eye1Center.y, this.gridUnit / 4, eye1Distance / 4, 0, 360, true, eye1Rotation);

        const eye2Rotation = RadToDeg(BetweenPoints(eyeTop2, eye2Center)) + 90 % 360;
        const eye2Distance = eyeTop2.distance(eye2Bottom);
        const eye2 = new Ellipse( eye2Center.x, eye2Center.y, this.gridUnit / 2,  eye2Distance / 3, 0, 360, true, eye2Rotation);
        const eye2Iris = new Ellipse( eye2Center.x, eye2Center.y, this.gridUnit / 4, eye2Distance / 4, 0, 360, true, eye2Rotation);
        const irisColor = 0x357388;
        // obscuredShapes.push(hand1Shape);
        // obscuredShapes.push({type: CIRCLE, shape: this.feetCircle, color: 0x000FF});
        this.walk(direction);

        if (!isObscured(eye1Iris)) {

            unubscuredShapes.push({type: ELLIPSE, shape: eye1, color: 0xFFFFFF});
            unubscuredShapes.push({type: ELLIPSE, shape: eye1Iris, color: irisColor});
        }
        if (!isObscured(eye2Iris)) {
            unubscuredShapes.push({type: ELLIPSE, shape: eye2, color: 0xFFFFFF});
            unubscuredShapes.push({type: ELLIPSE, shape: eye2Iris, color: irisColor});
        }

        const leg1 = {type: LINE,  shape: new Line(this.shoe1.x, this.shoe1.y, point.x, point.y), color: this.color, lineWidth: this.gridUnit * 1.2};
        const leg2 = {type: LINE,  shape: new Line(this.shoe2.x, this.shoe2.y, point.x, point.y), color: this.color, lineWidth: this.gridUnit * 1.2};
        obscuredShapes.push(leg1);
        obscuredShapes.push(leg2);
        const torso = new Circle(centerCenter.x, centerCenter.y, this.gridUnit * 2);
        const skirtLength = centerCenter.clone().lerp(centerBottom, 0.7);
        const skirt = this.drawTrepazoid(this.pathHelper, new Circle( skirtLength.x, skirtLength.y, this.gridUnit * 2.55), 0x006400, 0.97);
        if (skirt) {
            obscuredShapes.push(skirt);
        }
        obscuredShapes.push({type: CIRCLE, color: 0x09d51, shape: torso});

        let handPos1 = hand1;
        let handPos2 = hand2;
        if (this.pushedCrate && point2Vec(this.pushedCrate).distance(point) < this.size * 3.5) {
            const {centerCenter: center} = that.head;
            const circle = new Circle(center.x, center.y, this.size * 1.4);
            const a2 = (direction + 0.1) % 1;
            const b2 = (direction + 0.9) % 1;
            handPos1 = point2Vec(circle.getPoint(a2));
            handPos2 = point2Vec(circle.getPoint(b2));
        }

        obscuredShapes.push({type: CIRCLE, color: this.color, shape: new Circle(handPos1.x, handPos1.y, this.gridUnit * 0.8)});
        obscuredShapes.push({type: CIRCLE, color: this.color, shape: new Circle(handPos2.x, handPos2.y, this.gridUnit * 0.8)});
        const arm1 = {type: LINE,  shape: new Line(shoulder1Point.x, shoulder1Point.y, handPos1.x, handPos1.y), color: this.color, lineWidth: this.gridUnit * 1.2};
        const arm2 = {type: LINE,  shape: new Line(shoulder2Point.x, shoulder2Point.y, handPos2.x, handPos2.y), color: this.color, lineWidth: this.gridUnit * 1.2};

        obscuredShapes.push(arm1);
        obscuredShapes.push(arm2);
        obscuredShapes.push({type: CIRCLE, color: 0x09d51, shape: new Circle(shoulder1Point.x, shoulder1Point.y, this.gridUnit * 1.3)});
        obscuredShapes.push({type: CIRCLE, color: 0x09d51, shape: new Circle(shoulder2Point.x, shoulder2Point.y, this.gridUnit * 1.3)});

        graphics.fillStyle(faceFeatColor);

        this.drawShapes(obscuredShapes);
        graphics.fillStyle(this.color, 1);
        graphics.fillCircleShape(this.head.shape);

        const lok1 =  { x, y, radius: this.gridUnit , startAngle: 0, endAngle: all };
        const topBlonde = 0xF8E68B;
        const bottomBlonde = 0xD6C87F;
        const bunp = equator.getPoint(relativeAngle - direction - 0.5 % 1);
        const hair = this.drawTrepazoid(this.pathHelper, new Circle( bunp.x, bunp.y, this.gridUnit * 2.55), bottomBlonde, 0.96);
        if (hair) {
            unubscuredShapes.push(hair);
        }
        const topHair1 = this.getTopHairShape({x, y}, this.size, 1, 2.7);
        const topHair2 = this.getTopHairShape(point, this.size, 1.6, 1);
        unubscuredShapes.push({type: -1, shape: topHair1, color: topBlonde, strokeColor: 0x000});
        // unubscuredShapes.push({type: CIRCLE, shape: this.feetCircle, color: 0x000FF});
        unubscuredShapes.push({type: -1, shape: topHair2, color: topBlonde, strokeColor: 0x000});
        unubscuredShapes.push({type: -1, shape: lok1, color: topBlonde});
        graphics.lineStyle(this.gridUnit / 4, 0x000);

        graphics.strokeCircleShape(this.head.shape);
        graphics.fillStyle(this.color, 1);

        graphics.fillStyle(0x9f1f19, 0.7);
        dp(mouthPoint);
        graphics.fillStyle(0x9f1f19, 0.2);

        dp(eyeBottomLine.getPoint(cheek1));
        dp(eyeBottomLine.getPoint(cheek2));
        graphics.fillStyle(this.color, 1);

        dp(nosePoint);



        graphics.fillStyle(faceFeatColor, 1);

        graphics.fillStyle(0xFFFFFF, 1);
        this.drawShapes(unubscuredShapes);
        graphics.lineStyle(0, 0);
    }
    public crateCollider = (me: Player, crate: Crate) => {

      this.pushedCrate = crate;
      if (!crate.player) {
        crate.player = true;
      }
      this.handleCrateCollison(crate);
    }
    private walk(direction) {
        const { graphics } = this as unknown as PerspectiveMixinType;
        const that = this as ContainerLite;
        // re-enable moving in a certain direction if passed a blockade
        this.resetBlockedDirections();

        // Every frame, we create a new velocity for the sprite based on what keys the player is holding down.
        const velocity = new Phaser.Math.Vector2(0, 0);
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
        if (this.hasInput) {
            const count = this.pace / 600;
            if (this.now >= 1) {this.step = -count; }
            if (this.now <= 0) {this.step = +count; }
            this.now += this.step;
            const a1 = (direction + 0.45) % 1;
            const a2 = (direction + 0.05) % 1;

            const b1 = (direction + 0.55) % 1;
            const b2 = (direction + 0.95) % 1;
            const p1 = point2Vec(this.feetCircle.getPoint(a1));
            const p2 = point2Vec(this.feetCircle.getPoint(b1));
            graphics.fillStyle(0x0FFFFF, 1);
            const pp = this.feetCircle.getPoint(a2);
            const ppb = this.feetCircle.getPoint(b2);
            const pa = p1.clone().lerp(pp, this.now);
            const pb = p2.clone().lerp(ppb, Math.abs(this.now - 1));
            that.setChildPosition(this.shoe1, pa.x, pa.y);
            that.setChildPosition(this.shoe2, pb.x, pb.y);
            // We normalize the velocity so that the player is always moving at the same speed, regardless of direction.
          }
        const normalizedVelocity = velocity.normalize();
        that.body.setVelocity(normalizedVelocity.x * this.speed, normalizedVelocity.y * this.speed);
    }
    private drawTrepazoid(circle1, circle2, color, percent) {
        const { graphics, point } = this as unknown as PerspectiveMixinType;

        const ext = new Line(circle1.x, circle1.y, circle2.x, circle2.y);
        const crossb = Phaser.Geom.Line.Extend(ext, 0, this.gridUnit * 40);
        const cp = point2Vec(circle1.getPoint(0));
        const cp2 = point2Vec(circle2.getPoint(0));
        const crossa = Phaser.Geom.Line.Extend(new Line(cp.x, cp.y, cp2.x, cp2.y), this.gridUnit * 40);
        const cross = lineIntersect(crossb.getPointA(), crossb.getPointB(), crossa.getPointA(), crossa.getPointB());
        graphics.lineStyle(3, 0x000, 1);

        const tp = this.getExternalTangent(circle1, circle2, cross);
        if (tp && cross) {
            const {p1, p2, p3, p4} = tp;
            const shape = new Path();
            shape.moveTo(p1);
            shape.lineTo(p2);
            shape.lineTo(p4);
            shape.lineTo(p3);
            const mi = cross.clone().lerp(point, percent);
            const curve = new QuadraticBezier(p1, mi, p2);
            shape.closePath();
            shape.add(curve);

            return {type: -3, shape, color};
        }
    }
    // private getPointOnHead(callbackp1, point1) {
    //     if (callbackp1) {
    //         point1 = point1.distance(callbackp1[0]) < point1.distance(callbackp1[1]) ? callbackp1[0] : callbackp1[1];
    //     }
    //     return point1;
    // }
    private getTopHairShape(position, radius, hl1, hl2) {
        const { shape, pi2: all } = this.head;
        const direction = (this as ContainerLite).body.angle;

        const shoulder1 = direction + hl1 % Math.PI;
        const shoulder2 =  direction - hl2 % Math.PI;

        return { x: position.x, y: position.y, radius, startAngle: shoulder1, endAngle: shoulder2 };
    }
    private getMiddle(top, bottom, floorTop, floorBottom) {
        const middle = lineIntersect(top, floorBottom, bottom, floorTop);
        return middle;
    }
    private pushCrateImpl(direction: string, crate: Crate) {
        this.setCollidedObject(crate);
        this.pushing = true;
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
