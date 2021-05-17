import { Physics, GameObjects } from 'phaser';
import Crate from './Crate';
import CollidesWithObjects from './CollidesWithObjects';
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite';
import PerspectiveObject, {PerspectiveMixinType} from './PerspectiveMixin';
import BetweenPoints = Phaser.Math.Angle.BetweenPoints;
import Normalize = Phaser.Math.Angle.Normalize;
import Vector2 = Phaser.Math.Vector2;
import Circle = Phaser.Geom.Circle;
import RadToDeg = Phaser.Math.RadToDeg;
import Line = Phaser.Geom.Line;
import QuadraticBezier = Phaser.Curves.QuadraticBezier;
import SphereClass from './Sphere';
import CIRCLE = Phaser.Geom.CIRCLE;
import LINE = Phaser.Geom.LINE;
import {getArcShape, point2Vec, pyt, setPosition, ShapeCollectionItem} from '../helpers';
import DegToRad = Phaser.Math.DegToRad;
import GameObject = Phaser.GameObjects.GameObject;

export default class Enemy extends CollidesWithObjects {
    private readonly speed: number = 0;
    private playersCrate: Crate;
    private $chasePlayer: boolean = true;
    private blankEnemy: Enemy;
    private center: Circle;
    private shadow: Circle;
    private color: number;
    private size: number;
    private pathHelper: Circle;
    private head: SphereClass;

    constructor(config, gridUnit: number, size: number, scale: number) {
        super(config.scene, config.x, config.y, size, scale);
        const {x, y} = config;
        const that = this as ContainerLite;
        that.body.setCollideWorldBounds(true);
        this.color = 0X0B6382;
        const shadowColor = 0X031920;
        this.size = size;
        this.shadow = config.scene.add.circle(x, y, size / 3.5, shadowColor, 0.4);
        that.add(this.shadow);
        this.center = new Circle(x, y, size * 1.2);
        this.pathHelper = new Circle(x, y, size);

        const Sphere = PerspectiveObject(SphereClass);
        const quarter = size * 2;
        this.head = new Sphere(config.scene, x, y, quarter, quarter, quarter,  this.color);
        this.head.setDepth(2);
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
        const {point} = this as unknown as PerspectiveMixinType;
        const body = ((this as unknown as GameObject).body as Physics.Arcade.Body);

        const enemyVelocity = new Vector2(player.x - point.x , player.y  - point.y).normalize();
        const xSpeed = this.blockedDirection.left || this.blockedDirection.right ? 0 : this.speed;
        const ySpeed = this.blockedDirection.up || this.blockedDirection.down ? 0 : this.speed;

        if (this.pushedCrate) {
            this.resetBlockedDirections(BetweenPoints(this.pushedCrate, point));
        }

        body.setVelocity(enemyVelocity.x * xSpeed, enemyVelocity.y * ySpeed);
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
        //   this.pushCrateImpl('down', crate);
      }

      public update() {
          const that = (this as ContainerLite);
          that.graphics.setDepth(2);

          if (this.pushedCrate) {
            if (this.pushedCrate.x - that.x > this.pushedCrate.height || this.pushedCrate.y - that.y > this.pushedCrate.height) {
                this.pushedCrate.enemy = null;
            }
        }
          that.graphics.clear();
          that.graphics.lineStyle();
          const obscuredShapes: ShapeCollectionItem[] = [];
          const unubscuredShapes: ShapeCollectionItem[] = [];

          that.predraw();
          const { dp, graphics, point, centerBottom, centerCenter, vanishPoint, pastCenter} = this as unknown as PerspectiveMixinType;
          setPosition(this.pathHelper, that);
          setPosition(this.head, that);
          setPosition(this.center, centerCenter);
          this.head.update();
          const { equator, pi2: all, shape: sphere} = this.head as unknown as SphereClass;
          const {curve: eyeLine, isObscured} = this.head.getSlice('x', 0.65);
          const {curve: brow} = this.head.getSlice('x', 0.75);
          const hoverPosition = centerBottom.clone().lerp(point, 0.1);
          const feetCircle = new Circle(hoverPosition.x, hoverPosition.y, sphere.radius / 2.3);
          graphics.fillCircleShape(feetCircle);

          that.setChildPosition(this.shadow, centerBottom.x, centerBottom.y);
          const direction = Normalize(that.body.angle) / all;

          const relativeAngle  = Normalize(BetweenPoints(vanishPoint, point)) / all;

          const rightShoulder = (direction + 0.25) % 1;
          const leftShoulder =  (direction + 0.75) % 1;

          const shoulder1Point = equator.getPoint(relativeAngle - direction - 0.25 % 1);
          const shoulder2Point = equator.getPoint(relativeAngle - direction - 0.75 % 1);
          const hand1 = new Vector2(Circle.GetPoint(this.center, rightShoulder));
          const hand2 = new Vector2(Circle.GetPoint(this.center, leftShoulder));
          graphics.fillStyle(this.color);
          const handColor = 0X2405B;

          const torso = this.getTrepazoid(this.head.shape, feetCircle, this.color, 0.9, vanishPoint, handColor);
          const type = CIRCLE;
          const {shape: { x, y, radius } } = this.head;

          if (torso) {
              obscuredShapes.push(torso);
              const {p3, p4} = torso.points;
              const ang1 = (BetweenPoints(this.head.shape, p3)) ;
              const ang2 = (BetweenPoints(this.head.shape, p4));

              const startAngle = pastCenter('y') ? ang2 : ang1;
              const endAngle = startAngle === ang1 ? ang2 : ang1;
              const shape = { x, y, radius, startAngle , endAngle, anticlockwise: false };
              unubscuredShapes.push({type: -1, shape, color: this.color, strokeColor: handColor});
          } else {
              unubscuredShapes.push({type, shape: new Circle(x, y, radius), color: this.color, strokeColor: handColor});
          }

          const hand1Shape = {type, shape: new Circle(hand1.x, hand1.y, this.gridUnit), color: handColor, strokeColor: 0x000};
          const hand2Shape = {type, shape: new Circle(hand2.x, hand2.y, this.gridUnit), color: handColor, strokeColor: 0x000};
          graphics.fillStyle(this.color, 1);
          graphics.fillPath();
          const nose = relativeAngle - direction;
          const eye1Angle = nose - 0.95 % 1;
          const eye2Angle = nose - 0.05 % 1;
          const eye1 = eyeLine.getPoint(eye1Angle);
          const eye2 = eyeLine.getPoint(eye2Angle);
          const browStart = brow.getPoint(nose - 0.9 % 1);
          const browmiddle = brow.getPoint(nose);
          const browEnd = brow.getPoint(nose - 0.1 % 1);

          const faceFeatColor = 0x16D8D8;
          const lineWidth = this.size / 4;
          const arm1 = {type: LINE, lineWidth,  shape: new Line(shoulder1Point.x, shoulder1Point.y, hand1.x, hand1.y), color: 0x000};
          const arm2 = {type: LINE, lineWidth, shape: new Line(shoulder2Point.x, shoulder2Point.y, hand2.x, hand2.y), color: 0x000};
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
                obscuredShapes.push(arm1);
                obscuredShapes.push(hand1Shape);
            } else {
                unubscuredShapes.push(arm1);
                unubscuredShapes.push(hand1Shape);
            }
          if (this.head.isObscured(shoulder2Point)) {
                obscuredShapes.push(arm2);
                obscuredShapes.push(hand2Shape);
            } else {
                unubscuredShapes.push(arm2);
                unubscuredShapes.push(hand2Shape);
            }

          graphics.fillStyle(faceFeatColor);

          const wh = this.gridUnit / 1.7;

          unubscuredShapes.push({type: -1, shape: this.getEyeShape(eye1, wh), color: faceFeatColor, strokeColor: handColor});
          unubscuredShapes.push({type: -1, shape: this.getEyeShape(eye2, wh), color: faceFeatColor, strokeColor: handColor});

          this.drawShapes(obscuredShapes);
          graphics.fillStyle(this.color, 1);
          const { shape: head } = this.head;
          graphics.fillCircleShape(head);
          graphics.fillStyle(faceFeatColor, 1);
          this.drawShapes(unubscuredShapes);
          const curve = new QuadraticBezier(browStart, browmiddle, browEnd);
          curve.draw(graphics);

          graphics.lineStyle(0, 0);
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

    private pushCrateImpl(direction: string, crate: Crate) {
        const that = (this as unknown as GameObjects.Container);
        this.setBlockedDirection(direction);
        (that.body as Physics.Arcade.Body).setVelocity(0);
    }
}
