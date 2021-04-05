import { Physics, Types } from 'phaser';
import { collidesOnAxes, impassable, lineIntersect } from '../helpers';

import Crate from './Crate';
import CollidesWithObjects from './CollidesWithObjects';
import ArcadeBodyBounds = Phaser.Types.Physics.Arcade.ArcadeBodyBounds;
import Sprite = Phaser.Physics.Arcade.Sprite;
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite';
import {PerspectiveMixinType} from './PerspectiveMixin';
import Circle = Phaser.Geom.Circle;
import CubicBezier = Phaser.Curves.CubicBezier;
import Vector2 = Phaser.Math.Vector2;
import BetweenPoints = Phaser.Math.Angle.BetweenPoints;
import Normalize = Phaser.Math.Angle.Normalize;
import QuadraticBezier = Phaser.Curves.QuadraticBezier;
import Reverse = Phaser.Math.Angle.Reverse;
import Arc = Phaser.GameObjects.Arc;
import Curve = Phaser.Curves.Curve;
import RadToDeg = Phaser.Math.RadToDeg;
import Line = Phaser.Geom.Line;
import ShortestBetween = Phaser.Math.Angle.ShortestBetween;
import DegToRad = Phaser.Math.DegToRad;
import RECTANGLE = Phaser.Geom.RECTANGLE;
import Rectangle = Phaser.Geom.Rectangle;

import PerspectiveObject from '../gameobjects/PerspectiveMixin';
import SphereClass from './Sphere';

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
    private head: PerspectiveMixinType;

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
        // this.add(this.head);
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
        that.graphics.setDepth(2);
        const { scene } = that;
        const {physics: {world: {bounds: {height, width, centerX, centerY}}}} = scene;

        that.setChildPosition(this.pathHelper, that.x, that.y);
        that.setChildPosition(this.head, that.x, that.y);
        that.predraw();
        const { vertices: v, x, y, graphics, point, centerBottom, vanishPoint} = this as unknown as PerspectiveMixinType;
        const centerCenter = centerBottom.clone().lerp(that.point, 0.5).clone();
        that.setChildPosition(this.center, centerCenter.x, centerCenter.y);
/////////////////
        const faceFeatColor = 0x16D8D8;
        //

        that.head.predraw();
        that.head.predrawSphere(that.body.angle, this.pathHelper);
        const { equator: mouthLine, meridian: eyeLine } = this.head as unknown as SphereClass;

        if (centerBottom) {

            that.setChildPosition(this.shadow, centerBottom.x, centerBottom.y);
            const all = 2 * Math.PI;

            const angle = BetweenPoints(that.point, this.shadow);

            const angleN = Normalize(angle);
            const defA = (angleN / all);
            const direction = Normalize(that.body.angle) / all;
            const rightShoulder = (direction + 0.25) % 1;
            const leftShoulder =  (direction + 0.75) % 1;

            const facingCenter = defA + 0.25;
            const mirrorA = Math.abs(facingCenter - 0.5);
            const facingDirectionPoint = new Vector2(Circle.GetPoint(this.pathHelper, direction));
            const shoulder1Point = new Vector2(Circle.GetPoint(this.pathHelper, leftShoulder));
            const hand1 = new Vector2(Circle.GetPoint(this.center, leftShoulder));
            const shoulder2Point = new Vector2(Circle.GetPoint(this.pathHelper, rightShoulder));
            const hand2 = new Vector2(Circle.GetPoint(this.center, rightShoulder));

            const p1 = new Vector2(Circle.GetPoint(this.pathHelper, facingCenter));
            const p2 = new Vector2(Circle.GetPoint(this.pathHelper, mirrorA ));
            const p3 = new Vector2(Circle.GetPoint(this.shadow, facingCenter)).lerp(that.vanishPoint, 0.05);
            const p4 = new Vector2(Circle.GetPoint(this.shadow, mirrorA)).lerp(that.vanishPoint, 0.05);
            // graphics.fillPoint(test.x, test.y, this.gridUnit);
            // graphics.fillPoint(shoulder2Point.x, shoulder2Point.y, this.gridUnit);
            graphics.fillStyle(this.color);
            graphics.fillCircle(hand1.x, hand1.y, this.gridUnit / 1.5);
            graphics.fillCircle(hand2.x, hand2.y, this.gridUnit / 1.5);

            this.torso = new CubicBezier(p1, p3, p4, p2);
            // const curve = new QuadraticBezier(shoulder1Point, centerBottom, shoulder2Point);
            const bottomBound = new Vector2(vanishPoint.x, this.worldBounds.y);
            const leftBound = new Vector2(this.worldBounds.x, vanishPoint.y);
            const yAxis = new Vector2(vanishPoint.x, y);
            const xAxis = new Vector2(x, vanishPoint.y);
            const fullY = vanishPoint.distance(bottomBound);
            const fullX = vanishPoint.distance(leftBound);
            const meY = vanishPoint.distance(yAxis);
            const meX = vanishPoint.distance(xAxis);
            // const dist = floorBottom.distance(bottom);
            // const mouthLine = new Phaser.Curves.Ellipse(x, y, this.size, (meY / fullY) * this.size, 0, 0.1, true, RadToDeg(angle) + 45);
            // const mouthLine2 = new Phaser.Curves.Ellipse(x, y, (meX / fullX) * this.size, this.size, 0, 1, true /*RadToDeg(angle)*/);
            // const m1 = mouthLine.getPoint(0.4);
            // const m3 = mouthLine.getPoint(0.6);
            const eye1 = eyeLine.getPoint(0.95);
            // const m2 = eyeLine.getPoint(0.7);
            const eye2 = eyeLine.getPoint(0.05);
            const faceFeatColor = 0x16D8D8;
            graphics.lineStyle(this.gridUnit / 4, faceFeatColor, 1);
            graphics.strokeLineShape( new Line(shoulder1Point.x, shoulder1Point.y, hand1.x, hand1.y));
            graphics.strokeLineShape( new Line(shoulder2Point.x, shoulder2Point.y, hand2.x, hand2.y));
            // graphics.strokeLineShape( new Line(x, y, vanishPoint.x, vanishPoint.y));
            // graphics.strokeLineShape( new Line(x, y, shoulder2Point.x, shoulder2Point.y));
            // graphics.strokeLineShape( new Line(shoulder2Point.x, shoulder2Point.y, vanishPoint.x, vanishPoint.y));
            const line = new Line(shoulder2Point.x, shoulder2Point.y, vanishPoint.x, vanishPoint.y);
            // const triAngle = DegToRad(45);
            // const angle = this.body.angle - triAngle
            const newline = Phaser.Geom.Line.SetToAngle(line, shoulder2Point.x, shoulder2Point.y, (DegToRad(45)), this.size);
            const bottomSphere = lineIntersect(point, vanishPoint, shoulder2Point, newline.getPointB());

            // bottomSphere && graphics.strokeLineShape( new Line(point.x, point.y, bottomSphere.x, bottomSphere.y));

            // newpoint && graphics.strokeLineShape(new Line(x, y, newpoint.x, newpoint.y));
            // graphics.strokeLineShape(newline);
            // lineIntersect(shoulder2Point, vanishPoint, point, newline.getPointB());

            graphics.lineStyle(0, 0);
            graphics.fillStyle(this.color, 0.5);

            // this.torso.draw(graphics);

            graphics.fillPath();
            graphics.strokePath();

            graphics.fillStyle(faceFeatColor);

            graphics.fillCircle(eye1.x, eye1.y, this.gridUnit / 2.5);
            graphics.fillCircle(eye2.x, eye2.y, this.gridUnit / 2.5);
            graphics.lineStyle(this.gridUnit / 4, faceFeatColor);
            mouthLine.draw(graphics);
            // graphics.fillPath();

            // mouthLine2.draw(graphics);

                // const mouth = new QuadraticBezier(m1, m2, m3);
            // arc.draw(that.graphics);

            //  Without this the arc will appear closed when stroked
            graphics.beginPath();
            // that.graphics.arc( x, y, this.size, Reverse(BetweenPoints(m1, that.point)), Reverse(BetweenPoints(m3, that.point)), true);

            graphics.strokePath();

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
