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
import Graphics = Phaser.GameObjects.Graphics;
import BetweenPoints = Phaser.Math.Angle.BetweenPoints;
import Normalize = Phaser.Math.Angle.Normalize;

export default class Player extends CollidesWithObjects {
    private speed;
    private hasInput: boolean;
    private cursorKeys: Types.Input.Keyboard.CursorKeys;
    private pace: number = 30;
    private crates: Crate[];
    private factor: number = (this.pace / 10) * 2.5;
    private worldBounds: ArcadeBodyBounds;

    private tempMatrix;
    private tempParentMatrix;
    private topSprite: Sprite;
    private bottomSprite: Sprite;
    private centerSprite: Sprite;
    private head: Circle;
    private shadow: Circle;
    private color: number;
    private path;
    private curve;
    private pathHelper: Circle;

    constructor(config, gridUnit: number, crates: Physics.Arcade.Group, size, scale) {
        super(config.scene, config.x, config.y, size, size);
        const that = this as ContainerLite;
        const {x, y} = config;
        this.color = 0X0B6382;
        const shadowColor = 0X031920;
        this.shadow = config.scene.add.circle(x, y, size * 0.85, shadowColor, 0.4);
        this.head = config.scene.add.circle(x, y, size, this.color);
        this.pathHelper = config.scene.add.circle(x, y, size * 0.85, this.color);
        that.add(this.shadow);
        that.add(this.head);

        that.setScale(scale, scale);

        that.body.setCollideWorldBounds(true);
        // that.graphics.setDepth(3);

        this.crates = crates.children.getArray() as Crate[];
        this.speed = gridUnit * this.pace;
        this.gridUnit = gridUnit / 10;
        this.cursorKeys = config.scene.input.keyboard.createCursorKeys();
        this.pushCrate = this.pushCrateImpl;
        this.worldBounds = config.scene.physics.world.bounds;

        this.tempMatrix = new Phaser.GameObjects.Components.TransformMatrix();
        this.tempParentMatrix = new Phaser.GameObjects.Components.TransformMatrix();

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
        that.graphics.setDepth(2);
        that.draw();

        const { scene } = that;
        const {physics: {world: {bounds: {height, width, centerX, centerY}}}} = scene;

        const { corner, floorBottom, floorTop, top, bottom, left, right, x, y } = this as unknown as PerspectiveMixinType;

        const centerBottom = corner.clone().lerp(floorTop, 0.5).clone();
        that.setChildPosition(this.head, x, y);
        that.setChildPosition(this.pathHelper, x, y);




        if (centerBottom) {
            that.setChildPosition(this.shadow, centerBottom.x, centerBottom.y);
            const all = 2 * 3.14159265359;

            const angle = that.pastCenter('x', that.point.x) ?  BetweenPoints(this.head, that.shadow) : BetweenPoints(this.shadow, this.head);
            // const angle = BetweenPoints(that.point, that.vanishPoint);
            const angleN = Normalize(angle);
            const defA = (angleN / all);
            // const facingCenter = that.pastCenter('x', that.point.x) ? defA + 0.25 : defA - 0.25;
            const facingCenter = defA + 0.25;
            const mirrorA = Math.abs(facingCenter - 0.5);
            const p1 = new Vector2(Circle.GetPoint(this.pathHelper, facingCenter));
            const p2 = new Vector2(Circle.GetPoint(this.pathHelper, mirrorA ));
            // console.log(defA, mirrorA);
            const p3 = new Vector2(Circle.GetPoint(this.shadow, facingCenter)).lerp(that.vanishPoint, 0.07);
            const p4 = new Vector2(Circle.GetPoint(this.shadow, mirrorA)).lerp(that.vanishPoint, 0.07);
            that.graphics.fillStyle(this.color);
            this.path = new CubicBezier(p1, p3, p4, p2);

            this.path.draw(that.graphics);
            that.graphics.fillPath();
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
