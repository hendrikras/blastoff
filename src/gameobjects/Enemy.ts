import {Physics} from 'phaser';
import Crate from './Crate';
import CollidesWithObjects, { SphereType } from './CollidesWithObjects';
import PerspectiveObject, {PerspectiveMixinType} from './PerspectiveMixin';
import SphereClass from './Sphere';
import {Direction, point2Vec, setPosition, ShapeCollectionItem, getNavMesh, mapPointsToArray} from '../helpers';
import BetweenPoints = Phaser.Math.Angle.BetweenPoints;
import Normalize = Phaser.Math.Angle.Normalize;
import Vector2 = Phaser.Math.Vector2;
import Circle = Phaser.Geom.Circle;
import Line = Phaser.Geom.Line;
import Triangle = Phaser.Geom.Triangle;
import QuadraticBezier = Phaser.Curves.QuadraticBezier;
import CIRCLE = Phaser.Geom.CIRCLE;
import LINE = Phaser.Geom.LINE;
import GameObject = Phaser.GameObjects.GameObject;
import Rectangle = Phaser.Geom.Rectangle;

// import smooth from 'smooth-polyline';

import Between = Phaser.Math.Distance.Between;
import Path = Phaser.Curves.Path;

export default class Enemy extends CollidesWithObjects {
    public get chasePlayer() {
      return this.$chasePlayer;
    }
    public set chasePlayer(value: boolean) {
      this.$chasePlayer = value;
    }
      private static getClosestPoint(point: Vector2, path: Vector2[]) {
        let closest = path[0];
        let closestDistance = Between(point.x, point.y, path[0].x, path[0].y);
        for (let i = 1; i < path.length; i++) {
            const distance = Between(point.x, point.y, path[i].x, path[i].y);
            if (distance < closestDistance) {
                closest = path[i];
                closestDistance = distance;
            }
        }
        return closest;
    }

    // function that compares the distance between 2 points and a reference point and returns the furthest point
    private static getFurthestPoint(a: Vector2, b: Vector2, point: Vector2) {
        // get the distance between the two points
        const distanceA = point.distance(a);
        const distanceB = point.distance(b);
        // return the furthest point
        return distanceA > distanceB ? b : a;
    }
    private static rect2Path(pathRect: Rectangle) {
        // turn rect into path
        let path;
        for (let i = 1; i < 5; i++) {
            const corner = point2Vec(pathRect.getPoint(0.25 * i));

            if (i === 1) {
                path = new Path(corner.x, corner.y);
            } else {
                path.lineTo(corner.x, corner.y);
            }
        }
        path.closePath();
        return path;
    }
    private readonly speed: number = 0;
    private playersCrate: Crate;
    private $chasePlayer: boolean = true;
    private blankEnemy: Enemy;
    private center: Circle;
    private shadow: Circle;
    public color: number;
    private size: number;
    private pathHelper: Circle;
    private collisionPoint: Vector2;
    private collisionRect: Rectangle;
    private pathLine: Line;
    private pathTriangle: Triangle;
    private pathTriangle2: Triangle;
    private path: Path;
    private acceleration: Vector2;
    private worldBounds: Rectangle;
    // private scene: Scene;
    private reverse = false;
    private navMesh: any;
    private mesh: any;

    constructor(config, gridUnit: number, size: number, scale: number) {
        super(config.scene, config.x, config.y, size, scale);

        this.navMesh = config.scene.navMeshPlugin;
        (this as unknown as GameObject).scene = config.scene;
        const {x, y} = config;
        // that.body.setCollideWorldBounds(true);
        const body = ((this as unknown as GameObject).body as Physics.Arcade.Body);
        body.setCollideWorldBounds(true);
        // body.setEnable(true);

        // body.setBounce(10, 10);
        this.color = 0X0B6382;
        const shadowColor = 0X031920;
        this.size = size;
        this.worldBounds = config.scene.physics.world.bounds;

        this.shadow = config.scene.add.circle(x, y, size / 2.5, shadowColor, 0.4);

        this.add(this.shadow as unknown as GameObject);
        this.center = new Circle(x, y, size * 1.2);
        this.pathHelper = new Circle(x, y, size);

        const Sphere = PerspectiveObject(SphereClass);
        const quarter = size * 2;
        this.head = new Sphere(config.scene, x, y, quarter, quarter, quarter,  this.color) as unknown as SphereType;
        this.head.setDepth(2);
        this.setScale(scale, scale);
        this.speed = gridUnit * 20;
        this.gridUnit = gridUnit / 10;
        this.acceleration = new Vector2(0, 0);
        this.pushCrate = this.pushCrateImpl;
    }
    public setBlockedDirection(direction: string) {
      this.blockedDirection[direction] = true;
    }
    public clearMesh() {
        this.navMesh.destroy();
    }
    public getWidth() {
        const body = ((this as unknown as GameObject).body as Physics.Arcade.Body);
        return body.width;
    }
    public updateMesh(polys) {
        // const polys = getNavMesh(crates, this.scene.physics.world.bounds, body.width);
        const navMesh = this.navMesh.buildMeshfromPolygons('mesh', polys);
        // navMesh.enableDebug(); // Creates a Phaser.Graphics overlay on top of the screen
        navMesh.debugDrawClear(); // Clears the overlay
        // Visualize the underlying navmesh
        navMesh.debugDrawMesh({
          drawCentroid: false,
          drawBounds: false,
          drawNeighbors: false,
          drawPortals: false,
        });
        this.mesh = navMesh;
    }
    public exterminate(player: Vector2, crates) {
        const {point} = this;
        const body = (this.body as Physics.Arcade.Body);
        // const tree = new RTree();
        //     const reachSize = body.width;
        //     const bbox = {
        //         minX: crate.x - reachSize,
        //         minY: crate.y - reachSize,
        //         maxX: crate.x + reachSize,
        //         maxY: crate.y + reachSize,
        //     };
        //         const result = (tree as any).search(bbox).filter((item) => item.crate !== crate);

        let navPath = this.mesh.findPath(point, player);
        if (!navPath) {
            const polys = getNavMesh(crates, (this as unknown as GameObject).scene.physics.world.bounds, body.width / 2);
            this.updateMesh(polys);
            navPath = this.mesh.findPath(point, player);
        }

        // navMesh.debugDrawPath(navPath, 0xffd900);

        if (navPath) {

            // const path = ;
            // const newPath = smooth(smooth(navPath.map(mapPointsToArray))).map((arr) => ({x: arr[0], y: arr[1]}));

            // console.log(navPath, newPath);
            this.convertToPath(navPath);
            // this.follow(this.path);
            this.moveAlong(navPath);
        }
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
          this.predraw();
          const { dp, graphics, point, centerBottom, centerCenter, vanishPoint, pastCenter} = this;
          if (this.pushedCrate) {
              if (this.pushedCrate && point2Vec(this.pushedCrate).distance(point) > this.pushedCrate.body.width) {
                  this.pushedCrate.enemy = null;
              }
          }
          graphics.setDepth(2);
          graphics.clear();
          const obscuredShapes: ShapeCollectionItem[] = [];
          const unubscuredShapes: ShapeCollectionItem[] = [];

          setPosition(this.pathHelper, this);
          setPosition(this.head, this);
          setPosition(this.center, centerCenter);
          this.head.update();
          const { equator, pi2: all, shape: sphere} = this.head;
          const {curve: eyeLine, isObscured} = this.head.getSlice('x', 0.65);
          const {curve: brow} = this.head.getSlice('x', 0.75);
          const hoverPosition = centerBottom.clone().lerp(point, 0.1);
          const feetCircle = new Circle(hoverPosition.x, hoverPosition.y, sphere.radius / 2.3);
          graphics.fillCircleShape(feetCircle);

          this.setChildPosition((this.shadow as unknown as GameObject), centerBottom.x, centerBottom.y);
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
              obscuredShapes.push({...torso, ...{order: 0}});
              const {p3, p4} = torso.points;
              const ang1 = (BetweenPoints(this.head.shape, p3)) ;
              const ang2 = (BetweenPoints(this.head.shape, p4));

              const startAngle = pastCenter('y') ? ang2 : ang1;
              const endAngle = startAngle === ang1 ? ang2 : ang1;
              const shape = { x, y, radius, startAngle , endAngle, anticlockwise: false };
              unubscuredShapes.push({type: -1, shape, color: this.color, strokeColor: handColor, order: 1});
          } else {
              unubscuredShapes.push({type, shape: new Circle(x, y, radius), color: this.color, strokeColor: handColor, order: 2});
          }

          const hand1Shape = {type, shape: new Circle(hand1.x, hand1.y, this.gridUnit), color: handColor, strokeColor: 0x000, order: 6};
          const hand2Shape = {type, shape: new Circle(hand2.x, hand2.y, this.gridUnit), color: handColor, strokeColor: 0x000, order: 7};
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
          const arm1 = {type: LINE, lineWidth,  shape: new Line(shoulder1Point.x, shoulder1Point.y, hand1.x, hand1.y), color: 0x000, order: 4};
          const arm2 = {type: LINE, lineWidth, shape: new Line(shoulder2Point.x, shoulder2Point.y, hand2.x, hand2.y), color: 0x000, order: 5};
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
                unubscuredShapes.push({type: -2, shape, color: 0x000, order: 3});
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

          unubscuredShapes.push({type: -1, shape: this.getDomeShape(eye1, wh), color: faceFeatColor, strokeColor: handColor, order: 8});
          unubscuredShapes.push({type: -1, shape: this.getDomeShape(eye2, wh), color: faceFeatColor, strokeColor: handColor, order: 9});

          this.drawShapes(obscuredShapes);
          graphics.fillStyle(this.color, 1);
          const { shape: head } = this.head;
          graphics.fillCircleShape(head);
          graphics.fillStyle(faceFeatColor, 1);
          this.collisionPoint && dp(this.collisionPoint);
          this.collisionRect && graphics.strokeRect(this.collisionRect.x, this.collisionRect.y, this.collisionRect.width, this.collisionRect.height);
          this.path && this.path.draw(graphics);
          // set the line to orange
        //   graphics.lineStyle(lineWidth, handColor);
          this.pathLine && graphics.strokePoints([this.pathLine.getPointA(), this.pathLine.getPointB()]);
          if (this.pathTriangle) {
            const p1 = this.pathTriangle.getPoint(0);
            const p2 = this.pathTriangle.getPoint(0.3333);
            const p3 = this.pathTriangle.getPoint(0.6666);
            graphics.strokeTriangle(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
          }

          if (this.pathTriangle2) {
            const P1 = this.pathTriangle2.getPoint(0);
            const P2 = this.pathTriangle2.getPoint(0.3333);
            const P3 = this.pathTriangle2.getPoint(0.6666);
            this.pathTriangle2 && graphics.strokeTriangle(P1.x, P1.y, P2.x, P2.y, P3.x, P3.y);
          }

          // this.collisionRect && graphics.fillRectShape(this.collisionRect);
          const curve = new QuadraticBezier(browStart, browmiddle, browEnd);
          unubscuredShapes.push({type: -2, shape: curve, color: handColor, order: 10});
          this.drawShapes(unubscuredShapes);
          graphics.lineStyle(0, 0);
          }
    public moveAlong(path: Phaser.Math.Vector2[]) {
    if (!path || path.length <= 0) {
        return;
    }

    const movePath = path;
    this.seek(point2Vec(movePath.shift()!));
    }

    private pushCrateImpl(direction: string) {
        this.setBlockedDirection(direction);
        const gameobject = this as unknown as GameObject;

        const body = gameobject.body as Physics.Arcade.Body;
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
    private seek(target: Vector2) {
        // set the velocity to the target
        const gameobject = this as unknown as GameObject;
        const body = gameobject.body as Physics.Arcade.Body;

        // get the center of the body
        const { point: center } = this;

        const dir = target.clone().subtract(center);
        dir.normalize();
        dir.scale(this.speed);
        body.setVelocity(dir.x, dir.y);
    }
}
