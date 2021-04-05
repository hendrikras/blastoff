import { Physics, GameObjects } from 'phaser';
import Crate from './Crate';
import CollidesWithObjects from './CollidesWithObjects';
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite';
import {PerspectiveMixinType} from './PerspectiveMixin';
import BetweenPoints = Phaser.Math.Angle.BetweenPoints;
import Normalize = Phaser.Math.Angle.Normalize;
import Vector2 = Phaser.Math.Vector2;
import Circle = Phaser.Geom.Circle;
import CubicBezier = Phaser.Curves.CubicBezier;
import RadToDeg = Phaser.Math.RadToDeg;
import Reverse = Phaser.Math.Angle.Reverse;
import Line = Phaser.Geom.Line;
import QuadraticBezier = Phaser.Curves.QuadraticBezier;

export default class Enemy extends CollidesWithObjects {
    private readonly speed: number = 0;
    private playersCrate: Crate;
    private $chasePlayer: boolean = true;
    private blankEnemy: Enemy;
    private center: Circle;
    private shadow: Circle;
    private color: number;
    private size: number;
    private torso;
    private pathHelper: Circle;

    constructor(config, gridUnit: number, size: number, scale: number) {
        super(config.scene, config.x, config.y, size, scale);
        const {x, y} = config;
        const that = this as ContainerLite;

        that.body.setCollideWorldBounds(true);
        this.color = 0X0B6382;
        const shadowColor = 0X031920;
        this.size = size;
        this.shadow = config.scene.add.circle(x, y, size * 0.85, shadowColor, 0.4);
        this.center = new Circle(x, y, size * 1.2);
        this.pathHelper = new Circle(x, y, size);

        that.setScale(scale, scale);
        this.speed = gridUnit * 20;
        this.gridUnit = gridUnit / 10;
        this.pushCrate = this.pushCrateImpl;
    }
    public get chasePlayer() {
      return this.$chasePlayer;
    }
    public set chasePlayer(value: boolean) {
      this.$chasePlayer = value;
    }
    public setBlockedDirection(direction: string) {
      this.blockedDirection[direction] = true;
    }
    public exterminate(player: Vector2) {
        const that = (this as unknown as GameObjects.Container);
        const enemyVelocity = new Vector2(player.x - that.x , player.y  - that.y).normalize();
        const xSpeed = this.blockedDirection.left || this.blockedDirection.right ? 0 : this.speed;
        const ySpeed = this.blockedDirection.up || this.blockedDirection.down ? 0 : this.speed;

        this.resetBlockedDirections();

        (that.body as Physics.Arcade.Body).setVelocity(enemyVelocity.x * xSpeed, enemyVelocity.y * ySpeed);

      }
      public cratesOverlap = (me: Enemy, crate: Crate) => {
        if (this.pushedCrate && this.playersCrate !== crate) {
            this.pushedCrate.enemy = this.blankEnemy;
        }
        this.pushedCrate = crate;
        this.blockedDirection.none = false;
        this.distanceToBoxCorner = crate.width;
        crate.enemy = me;
        this.handleCrateCollison(crate);
      }

      public update() {
          const that = (this as ContainerLite);
          if (this.pushedCrate) {
            if (this.pushedCrate.x - that.x > this.pushedCrate.height || this.pushedCrate.y - that.y > this.pushedCrate.height) {
                this.pushedCrate.enemy = null;
            }
        }
          that.predraw();
          this.drawBody();
      }

    private drawBody() {
        const { vertices: v, x, y, centerBottom, graphics } = this as unknown as PerspectiveMixinType;
        const that = this as ContainerLite;
        graphics.clear();
        graphics.setDepth(2);

        const { scene } = that;
        const {physics: {world: {bounds: {height, width, centerX, centerY}}}} = scene;

        that.setChildPosition(this.pathHelper, that.x, that.y);
        const centerCenter = centerBottom.clone().lerp(that.point, 0.5).clone();
        that.setChildPosition(this.center, centerCenter.x, centerCenter.y);

        if (centerBottom) {
            that.setChildPosition(this.shadow, centerBottom.x, centerBottom.y);
            const all = 2 * Math.PI;

            const angle = that.pastCenter('x') ? BetweenPoints(that.point, this.shadow) : BetweenPoints(this.shadow, that.point);

            const angleN = Normalize(angle);
            const defA = (angleN / all);
            const direction = Normalize(that.body.angle) / all;
            const rightShoulder = (direction + 0.25) % 1;
            const leftShoulder =  (direction + 0.75) % 1;

            const facingCenter = defA + 0.25;
            const mirrorA = Math.abs(facingCenter - 0.5);
            const shoulder1Point = new Vector2(Circle.GetPoint(this.pathHelper, leftShoulder));
            const hand1 = new Vector2(Circle.GetPoint(this.center, leftShoulder));
            const shoulder2Point = new Vector2(Circle.GetPoint(this.pathHelper, rightShoulder));
            const hand2 = new Vector2(Circle.GetPoint(this.center, rightShoulder));

            const p1 = new Vector2(Circle.GetPoint(this.pathHelper, facingCenter));
            const p2 = new Vector2(Circle.GetPoint(this.pathHelper, mirrorA ));
            const p3 = new Vector2(Circle.GetPoint(this.shadow, facingCenter)).lerp(that.vanishPoint, 0.05);
            const p4 = new Vector2(Circle.GetPoint(this.shadow, mirrorA)).lerp(that.vanishPoint, 0.05);
            graphics.fillStyle(this.color);
            graphics.fillCircle(hand1.x, hand1.y, this.gridUnit / 1.5);
            graphics.fillCircle(hand2.x, hand2.y, this.gridUnit / 1.5);

            this.torso = new CubicBezier(p1, p3, p4, p2);
            const eyeLine = new Phaser.Curves.Ellipse(x, y, this.size * 0.6, this.size * 0.6, 0, 1, true, RadToDeg(Reverse(that.body.angle)));
            const mouthLine = new Phaser.Curves.Ellipse(x, y, this.size, this.size, 0, 1, true, RadToDeg(Reverse(that.body.angle)));

            const mouth1 = mouthLine.getPoint(0.4);
            const mouth2 = mouthLine.getPoint(0.6);
            const eye1 = eyeLine.getPoint(0.4);
            const eye2 = eyeLine.getPoint(0.6);
            const faceFeatColor = 0x16D8D8;

            graphics.lineStyle(this.gridUnit / 4, faceFeatColor, 1);
            graphics.strokeLineShape( new Line(shoulder1Point.x, shoulder1Point.y, hand1.x, hand1.y));
            graphics.strokeLineShape( new Line(shoulder2Point.x, shoulder2Point.y, hand2.x, hand2.y));
            graphics.lineStyle(0, 0);
            graphics.fillCircle(x, y, this.size);

            this.torso.draw(graphics);

            graphics.fillPath();
            graphics.fillStyle(faceFeatColor);

            graphics.fillCircle(eye1.x, eye1.y, this.gridUnit / 2.5);
            graphics.fillCircle(eye2.x, eye2.y, this.gridUnit / 2.5);
            graphics.lineStyle(this.gridUnit / 4, faceFeatColor);

            graphics.beginPath();
            graphics.arc( x, y, this.size, Reverse(BetweenPoints(mouth1, that.point)), Reverse(BetweenPoints(mouth2, that.point)), true);

            graphics.strokePath();
        }
    }

    private pushCrateImpl(direction: string, crate: Crate) {
        const that = (this as unknown as GameObjects.Container);
        this.setBlockedDirection(direction);
        const opAxis = direction === 'right' || direction ===  'left' ? 'y' : 'x';
        this[`${opAxis}Threshold`] = crate[opAxis] / this.gridUnit;
        (that.body as Physics.Arcade.Body).setVelocity(0);
    }

}
