import {Curves, Physics} from 'phaser';
import Crate from './Crate';
import CollidesWithObjects from './CollidesWithObjects';
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite';
import PerspectiveObject, {PerspectiveMixinType} from './PerspectiveMixin';
import SphereClass from './Sphere';
import {Direction, point2Vec, setPosition, ShapeCollectionItem} from '../helpers';
import BetweenPoints = Phaser.Math.Angle.BetweenPoints;
import Normalize = Phaser.Math.Angle.Normalize;
import Vector2 = Phaser.Math.Vector2;
import Circle = Phaser.Geom.Circle;
import Line = Phaser.Geom.Line;
import QuadraticBezier = Phaser.Curves.QuadraticBezier;
import CIRCLE = Phaser.Geom.CIRCLE;
import LINE = Phaser.Geom.LINE;
import GameObject = Phaser.GameObjects.GameObject;
import Rectangle = Phaser.Geom.Rectangle;
import LineToRectangle = Phaser.Geom.Intersects.LineToRectangle;
import GetLineToRectangle = Phaser.Geom.Intersects.GetLineToRectangle;
import GetLineToCircle = Phaser.Geom.Intersects.GetLineToCircle;
import Between = Phaser.Math.Distance.Between;
import PathFollower = Phaser.GameObjects.PathFollower;
import RTree = Phaser.Structs.RTree;
import Path = Phaser.Curves.Path;
import PointToLine = Phaser.Geom.Intersects.PointToLine;

import scenes from '../scenes';

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
    private collisionPoint: Vector2;
    private collisionRect: Rectangle;
    private pathLine: Line;
    private path: Path;
    private follower: PathFollower;
    private acceleration: Vector2;
    private worldBounds: Rectangle;

    constructor(config, gridUnit: number, size: number, scale: number) {
        super(config.scene, config.x, config.y, size, scale);
        const {x, y} = config;
        const that = this as ContainerLite;
        // that.body.setCollideWorldBounds(true);
        const body = ((this as unknown as GameObject).body as Physics.Arcade.Body);
        body.setCollideWorldBounds(true);
        // body.setEnable(true);

        // body.setBounce(10, 10);
        this.color = 0X0B6382;
        const shadowColor = 0X031920;
        this.size = size;
        this.worldBounds = config.scene.physics.world.bounds;
        
        this.shadow = config.scene.add.circle(x, y, size / 3.5, shadowColor, 0.4);
        // const path1 = this.getLine(that.point, )
        const path1 = new Phaser.Curves.Path(x, y).circleTo(100);

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
        this.acceleration = new Vector2(0, 0);
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
    public exterminate(player: Vector2, crates) {
        const {point, graphics, dp} = this as unknown as PerspectiveMixinType;
        const body = ((this as unknown as GameObject).body as Physics.Arcade.Body);
        let target;
        const line = this.getLine(point, player);
        // const { add } = this as unknown as Sce;
        const tree = new RTree();

        crates.children.iterate((crate: Crate) => {
            const {left, right, top, bottom} = crate.getBounds();

            //  Insert our entry into the RTree:
            (tree as any).insert({left, right, top, bottom, crate});
        });

        let path;
        crates.children.iterate((crate: Crate) => {
            const {body: crateBody} = crate;

            const rect = new Rectangle(crate.x - crateBody.width / 2, crate.y - crateBody.height / 2, crateBody.width, crateBody.height);
            const prectSize = crateBody.width * 2;
            const pathCircle = new Circle(crate.x, crate.y, prectSize);
            const pathRect = new Rectangle(crate.x - prectSize / 2, crate.y - prectSize / 2, prectSize, prectSize);
            // const bbox = {
            //     minX: crate.x - prectSize / 2,
            //     minY: crate.y - prectSize / 2,
            //     maxX: crate.x + prectSize,
            //     maxY: crate.y + prectSize,
            // };

            if (LineToRectangle(line, rect)) {

                // get the point of intersection
                // const points = GetLineToCircle(line, pathCircle);
                const points = GetLineToRectangle(line, pathRect);

                const corners =  pathRect.getPoints(4);
                // get the closest point
                if (corners){
                // console.log(corners);

                    const closest = corners.reduce((prev, curr) => {

                        const distance = Between(point.x, point.y, curr.x, curr.y);
                        if (!prev) return curr;
                        if (distance < Between(point.x, point.y, prev.x, prev.y)) {
                            return curr;
                        }
                        return prev;
                    }, points[0]);     
                    // this.collisionPoint = point2Vec(closest);
                    const newLine = this.getLine(point, closest);
                    // path = newLine.getPoints(2).map((item) => point2Vec(item));
                }
                // path = pathRect.getPoints(4).map((item) => point2Vec(item));
                // this.path = new Path();
                // iterate Rectangle points

                for (let i = 1; i < 5; i++) {
                    const corner = pathRect.getPoint(0.25 * i);

                    if (i === 1) {
                        this.path = new Path(corner.x, corner.y);
                    } else {
                        this.path.lineTo(corner.x, corner.y);
                    }
            
                }
                this.path.closePath();
                // path = this.getSide(crate, pathRect);

               
                // const result = (tree as any).search(bbox).filter(({crate: res}) => res !== crate);
                // const useCrate =  crate ; // result.length > 0 ? result[0].crate : crate;
                // this.collisionRect = useCrate.getBounds();
                // pathRect.setPosition(useCrate.x, useCrate.y);
                // const useRect = new Rectangle(useCrate.x - prectSize / 2, useCrate.y - prectSize / 2, prectSize, prectSize);
                // this.collisionRect = pathRect;
                // path = pathRect.getPoints(8).map((item) => point2Vec(item));
                // path = this.getSide(crate, pathRect);




               
                // this.pathLine= pA;
                // console.log(path)
            }
        });
        
        const predict = body.velocity.clone();
        predict.normalize();
        predict.scale(this.gridUnit);
        predict.add(point);
        if (!path) {
            this.seek(player);
        }
        this.followPath(path);

        body.velocity.add(this.acceleration);
        body.velocity.limit(this.speed);
        //
        // const enemyVelocity = new Vector2(target.x - point.x , target.y  - point.y).normalize();
        // const xSpeed = this.blockedDirection.left || this.blockedDirection.right ? 0 : this.speed;
        // const ySpeed = this.blockedDirection.up || this.blockedDirection.down ? 0 : this.speed;
        //
        // if (this.pushedCrate) {
        //     this.resetBlockedDirections(this.pushedCrate);
        // }
        // // body.setVelocity(this.seek(target));
        // body.setVelocity(enemyVelocity.x * xSpeed, enemyVelocity.y * ySpeed);
      }
      public cratesOverlap = (me: Enemy, crate: Crate) => {
        if (this.pushedCrate && this.playersCrate !== crate) {
            this.pushedCrate.enemy = this.blankEnemy;
        }
        this.pushedCrate = crate;
        this.blockedDirection.none = false;
        // this.distanceToBoxCorner = crate.width;
        crate.enemy = me;
        this.handleCrateCollison(crate);
      }

      public update() {
          const that = (this as ContainerLite);
          that.predraw();
          const { dp, graphics, point, centerBottom, centerCenter, vanishPoint, pastCenter} = this as unknown as PerspectiveMixinType;
          if (this.pushedCrate) {
              if (this.pushedCrate && point2Vec(this.pushedCrate).distance(point) > this.pushedCrate.body.width) {
                  this.pushedCrate.enemy = null;
              }
          }
          graphics.setDepth(2);
          graphics.clear();
          const obscuredShapes: ShapeCollectionItem[] = [];
          const unubscuredShapes: ShapeCollectionItem[] = [];

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
          const bodyAngle = this.getBodyAngle();
          const direction = Normalize(bodyAngle) / all;

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
                unubscuredShapes.push({type: -2, shape, color: 0x000});
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

          const wh = this.gridUnit / 1.7;

          unubscuredShapes.push({type: -1, shape: this.getDomeShape(eye1, wh), color: faceFeatColor, strokeColor: handColor});
          unubscuredShapes.push({type: -1, shape: this.getDomeShape(eye2, wh), color: faceFeatColor, strokeColor: handColor});

          this.drawShapes(obscuredShapes);
          graphics.fillStyle(this.color, 1);
          const { shape: head } = this.head;
          graphics.fillCircleShape(head);
          graphics.fillStyle(faceFeatColor, 1);
          this.collisionPoint && dp(this.collisionPoint);
          this.path && this.path.draw(graphics);
          // set the line to orange
          graphics.lineStyle(lineWidth, handColor);
          this.pathLine && graphics.strokePoints(this.pathLine.getPoints(2));
          // this.collisionRect && graphics.fillRectShape(this.collisionRect);
          const curve = new QuadraticBezier(browStart, browmiddle, browEnd);
          unubscuredShapes.push({type: -2, shape: curve, color: handColor});
          this.drawShapes(unubscuredShapes);
          graphics.lineStyle(0, 0);
          }

    private pushCrateImpl(direction: string, crate: Crate) {
        this.setBlockedDirection(direction);
        const body = ((this as unknown as GameObject).body as Physics.Arcade.Body);
        const dir = Direction[direction];
        const vel = this.speed / 3;
        switch (dir) {
            case Direction.up :
                body.setVelocityY(vel);
                break;
            case Direction.down:
                body.setVelocityY(-vel);
                break;
            case Direction.left:
                body.setVelocityX(vel);
                break;
            case Direction.right:
                body.setVelocityX(-vel);
                break;
            default:
                body.setVelocity(0);
        }
    }
    private getSide(crate, pathRect) {
        const side = this.facingSide(crate);
        switch (side) {
        case Direction.up:
            return pathRect.getLineC();
        case Direction.right:
            return pathRect.getLineD();
        case Direction.down:
            return pathRect.getLineA();
        default:
            return pathRect.getLineB();
        }
    }
    private getNormalPoint(p: Vector2, a: Vector2, b: Vector2) {
        // PVector that points from a to p
        const ap = a .clone();
        ap.subtract(p);
        // PVector that points from a to b
        const ab = a.clone();
        ab.subtract(b);
        // Using the dot product for scalar projection
        ab.normalize();
        ab.scale(ap.dot(ab));
        // Finding the normal point along the line segment
        const res = a.clone();
        res.add(ab);
        return res;
    }
    private getGridSizeLength(){
        const {left, right, top, bottom} = this.worldBounds;
        const width = right - left;
        const height = bottom - top;
        const body = ((this as unknown as GameObject).body as Physics.Arcade.Body);
        const cols = 16;
        const rows = 21;

        const grid = new Array(cols);

        console.log('w', width, (width / body.width));
        console.log('h', height, (height / body.height));
        
    }
    private followPath(path: Vector2[]){
        // this.getGridSizeLength();
        const { point } = this as unknown as PerspectiveMixinType;
       
        // get the velocity of the object
        const body = ((this as unknown as GameObject).body as Physics.Arcade.Body);

        // predict the future location
        const predict = body.velocity.clone();
        predict.normalize();

        // go ahead of the path by the size
        predict.scale(this.size / this.gridUnit);

        // get the predicted location
        const predictLoc = body.position.clone().add(predict);
        // const point = body.position.clone();

        // find the normal point along the path
        let worldRecord: number = Infinity;
        let target;
        for (let i = 0; i < path?.length - 1; i++) {
            // console.log(123)
            const a = path[i].clone();
            const b = path[i + 1].clone();
            if (point === a || point === b) {
                console.log('point is on path');
                continue;
            }
             let normalPoint = this.getNormalPoint(predictLoc, a, b);
             // Check if the normal point is outside the line segment
             if (normalPoint.x < a.x || normalPoint.x > b.x) {
                normalPoint = b.clone();
               }
               
               
            // Length of normal from precictLoc to normalPoint
            let distance = predictLoc.distance(normalPoint);

            // Check if this normalPoint is nearest to the predictLoc
            if (distance < worldRecord) {
                this.pathLine = new Line(a.x, a.y, b.x, b.y);
         
                worldRecord = distance;
                // let the target be the normal point
                target = normalPoint.clone();
                this.collisionPoint = target;

            }
            // seek the target
            this.seek(target);
        }
    }
  
    private seek(target: Vector2): void {

        const { point } = this as unknown as PerspectiveMixinType;
        const desired = target.clone().subtract(point);
        // normalize the desired vector
        desired.normalize();
        desired.scale(this.speed);
        const body = ((this as unknown as GameObject).body as Physics.Arcade.Body);
        const steer = desired.clone().subtract(body.velocity);
        steer.limit(1);
        this.acceleration.add(steer);
    }
}
