import { Physics, Types } from 'phaser';
import { collidesOnAxes, impassable, lineIntersect } from '../helpers';

import Crate from './Crate';
import CollidesWithObjects from './CollidesWithObjects';
import ArcadeBodyBounds = Phaser.Types.Physics.Arcade.ArcadeBodyBounds;
import Sprite = Phaser.Physics.Arcade.Sprite;
import Vector2 = Phaser.Math.Vector2;
import Enemy from './Enemy';
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite';
import {PerspectiveMixinType} from './PerspectiveMixin';
import Group = Phaser.GameObjects.Group;

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
    private blankEnemy: Enemy;
    private blankCrate: Crate;

    constructor(config, gridUnit: number, crates: Physics.Arcade.Group, size, scale) {
        super(config.scene, config.x, config.y, size, size);
        const that = this as ContainerLite;
        const {x, y} = config;
        this.bottomSprite = config.scene.add.sprite(x, y , 'prison');
        this.topSprite = config.scene.add.sprite(x, y , 'prison');

        // this.centerSprite = config.scene.add.sprite(x, y , 'man');

        that.add(this.topSprite);
        that.add(this.bottomSprite);
        // console.log((this as any).children);
        that.setScale(scale, scale);
        that.body.setCollideWorldBounds(true);

        // this.add(this.bottomSprite);

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
        this.pushedCrate.enemy = this.blankEnemy;
      }
      this.pushedCrate = this.blankCrate;
    }
    public update() {
        const that = this as ContainerLite;
        const image = that.children[1] as Sprite;

        that.draw();

        // image.x = this.top.x;
        const { scene } = that;
        const {physics: {world: {bounds: {height, width, centerX, centerY}}}} = scene;

        const { corner, floorBottom, floorTop, left, right, x, y } = this as unknown as PerspectiveMixinType;
        const centerBottom = corner.clone().lerp(floorTop, 0.5).clone();

        if (centerBottom) {
            that.setChildPosition(this.bottomSprite, centerBottom.x, centerBottom.y);
        }
        that.setChildPosition(this.topSprite, x, y);

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
            // @ts-ignore
            // this.draw();

            velocity.y += 1;
            this.hasInput = true;
            this.blockedDirection.up = false;
        }

        // We normalize the velocity so that the player is always moving at the same speed, regardless of direction.
        const normalizedVelocity = velocity.normalize();
        (this as any).body.setVelocity(normalizedVelocity.x * this.speed, normalizedVelocity.y * this.speed);
      }
      // private draw(){}
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
