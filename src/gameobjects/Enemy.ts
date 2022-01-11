import {Curves, Geom, Physics, Scene} from 'phaser';
import Crate from './Crate';
import CollidesWithObjects from './CollidesWithObjects';
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite';
import PerspectiveObject, {PerspectiveMixinType} from './PerspectiveMixin';
import SphereClass from './Sphere';
import {Direction, getTriangle, point2Vec, setPosition, ShapeCollectionItem, findExternalTangents, getHomoTheticCenter, getInnerHomoTheticCenter, getHomoTheticCenterAngle} from '../helpers';
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
import decompose from 'rectangle-decomposition';

import LineToRectangle = Phaser.Geom.Intersects.LineToRectangle;
import GetLineToRectangle = Phaser.Geom.Intersects.GetLineToRectangle;
import GetLineToCircle = Phaser.Geom.Intersects.GetLineToCircle;
import RectangleToTriangle = Phaser.Geom.Intersects.RectangleToTriangle;

import Between = Phaser.Math.Distance.Between;
import PathFollower = Phaser.GameObjects.PathFollower;
import RTree = Phaser.Structs.RTree;
import Path = Phaser.Curves.Path;
import PointToLine = Phaser.Geom.Intersects.PointToLine;
// import NavMesh from '../plugins/navmesh';
import Point = Phaser.Geom.Point;
import RectangleToRectangle = Phaser.Geom.Intersects.RectangleToRectangle;
import GetRectangleToRectangle = Phaser.Geom.Intersects.GetRectangleToRectangle;
// import { NavMesh } from 'navmesh/src/index';
// import scenes from '../scenes';
import NavMesh from '../plugins/phaser-navmesh/src/phaser-navmesh'
import { RectangleHull } from '../plugins/navmesh/src';
import ArcadeBodyCollision = Phaser.Types.Physics.Arcade.ArcadeBodyCollision;
import concaveman from 'concaveman';
import gpc, { Polygon } from '../plugins/gpc';
import jestConfig from '../plugins/navmesh/jest.config';

export default class Enemy extends CollidesWithObjects {
    public get chasePlayer() {
      return this.$chasePlayer;
    }
    public set chasePlayer(value: boolean) {
      this.$chasePlayer = value;
    }
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
    private pathTriangle: Triangle;
    private pathTriangle2: Triangle;
    private path: Path;
    private acceleration: Vector2;
    private worldBounds: Rectangle;
    private scene: Scene;
    private reverse = false;
    private navMesh: any;

    constructor(config, gridUnit: number, size: number, scale: number) {
        super(config.scene, config.x, config.y, size, scale);
        console.log('enemy', config.scene);
        const navMesh = config.scene.navMeshPlugin;
        this.navMesh = navMesh;
        this.scene = config.scene;
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
    public setBlockedDirection(direction: string) {
      this.blockedDirection[direction] = true;
    }
    public clearMesh() {
        this.navMesh.clear();
    }
    public exterminate(player: Vector2, crates) {

//         var r = [  
//   [[100,100], [100,200], [150, 200], [150, 300], [200, 300], [200,100]],
//   [[0,0], [400,0], [400,400], [0,400]]
// ];


//     var rectangles = decompose(r);
//     console.log('decompose', rectangles);


    // begin
        const {point, graphics, dp} = this as unknown as PerspectiveMixinType;
        const body = ((this as unknown as GameObject).body as Physics.Arcade.Body);

        let triangle, triangle2;
        const {data} = this as unknown as GameObject;
        // const mesh = data.get('mesh');

        let crateRegions: number[][][] = [];

        const tree = new RTree();
        const cornerPoints: Point[] = [];
        const { left, top, bottom, right} = this.scene.physics.world.bounds;
        const substractCubes: Polygon[] = [];
        // console.log(top, left, right, bottom);
        crates.children.iterate((crate: Crate) => {
            const crateBody = ((crate as unknown as GameObject).body as Physics.Arcade.Body);
            const div = body.width / 2;
            const w = (crateBody.width / 2) + div;
            const h = (crateBody.height / 2) + div;
            const {x, y} = crate as unknown as Point;
            let isBoundry = false;
            const res = (num: number, boundry) => { 
                if ((boundry === left || boundry === top) && num < boundry){
                    isBoundry = true;
                    return Math.trunc(boundry);
                } else if ((boundry === right || boundry === bottom) && num > boundry){
                    isBoundry = true;
                    return  Math.trunc(boundry);
                } else {
                    return Math.trunc(num); 
                }
            };
            // const res2 = (num: number, boundry) => num > boundry ? Math.trunc(boundry) - 1 : Math.trunc(num);

            const leftX = res(x - w, left);
            const topY = res(y - h, top);
            const rightX = res(x + w, right);
            const bottomY = res(y + h, bottom);

            const current = [[leftX, topY], [leftX, bottomY], [rightX, bottomY], [rightX, topY]];
            const polys = current.map (([x,y]) => ({x, y}));

            if (isBoundry) {
                substractCubes.push(Polygon.fromPoints(polys));
            }
    
            const rect = new Rectangle(leftX, topY, w * 2, h * 2);
            let merged;
            crateRegions.forEach((prev) => {
                const [topLeft, bottomLeft, bottomRight, topRight] = prev;
                const prevRect = new Rectangle(topLeft[0], topLeft[1], w * 2, h * 2);
                if (RectangleToRectangle(rect, prevRect)) {
                    // const map = points.map((point) => [point.x, point.y]);
                    // const concave = concaveman(current.concat(prev));
                    
                    // const polys = current.map (([x,y]) => ({x, y})); 
                    const polys2 = prev.map (([x,y]) => ({x, y}));

                    const un = Polygon.fromPoints(polys);
                    const union = un.union(Polygon.fromPoints(polys2)) as unknown as {pointList: Point[]};
                    const unionArr = union?.pointList.map((point) => [point.x, point.y]);
                    const r = unionArr.slice().reverse();
                    // console.log('U', unionArr.reverse(), current,);
                    // find the index that has the smallest values
                    let smallest;
                    r.forEach((point, index) => {
                        const val = point[0] + point[1];
                        if (smallest === undefined || val < smallest.val) {
                            smallest =  {val, index};
                        }
                    });
                   
                    merged = r.slice(smallest.index, r.length).concat(r.slice(0, smallest.index));
                    // return;

                
                    // merged = unionArr;

                    // const p = this.shape2Path(unionArr).curves.reverse();
                    // let res: any[] = [];
                    // for (let j = 0; j < p.length; j++) {
                    //     if (j === 0) {
                    //         res.push(p[j].p0);
                    //         res.push(p[j].p1);
                    //     } else {
                    //         // res.push(p[j].p1);
                    //         res.push(p[j].p0);
                    //     }
                    // }

                    // // console.log(res);
                    // merged = res.map(({x, y}) => [x, y]);
                    // straigthen the concaved polygon
                   
                    // for (let i = 0; i < concave.length; i++) {
                    //     const p = concave[i];
                    //     const p2 = concave[(i + 1) % concave.length];
                    //     const point: Point = new Point(p[0], p[1]);
                    //     const point2 = new Point(p2[0], p2[1]);
                    //     // get the angle between the two points
                    //     const angle = Normalize(Phaser.Math.Angle.BetweenPoints(point, point2));
                    //     // convert to degrees
                    //     const degrees = Phaser.Math.RadToDeg(angle);
                    //     const div = degrees / 45
                    //     if (div % div !== 0){
                    //         const line = this.getLine(point, point2);
                    //         console.log(line);
                    //         this.pathLine =line;
                    //     }
                    //     console.log(div % div);
                    //     // const line = new Line(point[0], point[1], point2[0], point2[1]);
                    //     // console.log(line);
                    //     // this.collisionPoint = point2Vec(line.getPointB());
                    //     // this.pathLine = line;
                        
                    // }

                    // isUnMerged = false;
                    // prev = concave;
                    // const path = this.shape2Path(concave);
                    // this.path = path;
                    // console.log(path);
                    // console.log('merged', concave, current);
                    // const getDir = (rect) :ArcadeBodyCollision => ({
                    //     up:  LineToRectangle(rect.getLineA(), prevRect),
                    //     right: LineToRectangle(rect.getLineB(), prevRect),
                    //     down: LineToRectangle(rect.getLineC(), prevRect),
                    //     left: LineToRectangle(rect.getLineD(), prevRect),
                    //     none: false
                    // });
                }
            });
            
            if (crateRegions.length === 0 || !merged) {
                !isBoundry && crateRegions.push(current);
            }
            if (merged) {
                crateRegions = crateRegions.slice(1);
                crateRegions.push(merged);
            }

            // const {left, right, top, bottom} = crate.getBounds();

            //  Insert our entry into the RTree:
            // (tree as any).insert({left, right, top, bottom, crate});
        });
        // console.log(crateRegions);
        const region = [[Math.trunc(left), Math.trunc(top)], [Math.trunc(right), Math.trunc(top)], [Math.trunc(right), Math.trunc(bottom)], [Math.trunc(left), Math.trunc(bottom)]];
        const worldbox = Polygon.fromPoints(region.map (([x,y]) => ({x, y})) );
        
        let sub = worldbox;
        substractCubes.forEach((poly) => {
            sub = sub.difference(poly);
        });
          // console.log(sub.toVertices().bounds.slice().reverse());\

        const newreg = sub.toVertices().bounds[0].map((point) => [point.x, point.y]);
        crateRegions.push(newreg);
        // console.log(crateRegions);  
        const partitioned = decompose(crateRegions);
        const polys = partitioned.map ((decomp) => {
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

        // const hulls = partitioned.map((decomp) => {
        //         const topLeft = new Vector2(decomp[0][0], decomp[0][1]);
        //         const bottomRight = new Vector2(decomp[1][0], decomp[1][1]);
        //         return new RectangleHull(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
        //     });

        // console.log(polys)
        // const navMesh = this.navMesh.buildPolysFromGridMap(polys);
        // const navMesh = new NavMesh(polys);

      
        // const polygons = hulls.map((hull) => hull.toPoints());
        // console.log(polys, polygons);
        const navMesh = this.navMesh.buildMeshfromPolygons('mesh', polys);
        navMesh.enableDebug(); // Creates a Phaser.Graphic   s overlay on top of the screen
        navMesh.debugDrawClear(); // Clears the overlay
        // Visualize the underlying navmesh
        navMesh.debugDrawMesh({
          drawCentroid: false,
          drawBounds: false,
          drawNeighbors: false,
          drawPortals: false,
        });
        // Visualize an individual path
        // navMesh.debugDrawPath(path, 0xffd900);
        
        

        const navPath = navMesh.findPath(point, player);
        navMesh.debugDrawPath(navPath, 0xffd900);

        if (navPath) {
            const start = navPath.shift() as Vector2;
            const path = new Path(start.x, start.y);
            // tslint:disable-next-line:no-unused-expression
            navPath?.length > 0 && navPath?.forEach(({x, y}, index) => {
                path.lineTo(x, y);
            });

            this.follow(path);
        }

        const playerCircle = new Circle(player.x, player.y, body.width / 2);
        const center = new Circle(this.center.x, this.center.y, this.center.radius);

        // const cross = getHomoTheticCenter(copyCircle(this.center), copyCircle(playerCircle), this.gridUnit);
        // const col = this.getExternalTangent(copyCircle(playerCircle), copyCircle(this.center), cross);
        const cross = getHomoTheticCenter(center, playerCircle);
        // const cross2 = getInnerHomoTheticCenter(center, playerCircle);
        // const cross3 = getHomoTheticCenterAngle(center, playerCircle);
        const col = findExternalTangents(playerCircle, center, cross);
        // this.collisionPoint = cross as Vector2;
        // const col2 = this.getExternalTangent(playerCircle, center, cross as unknown as Geom.Point);
        const getxy = ({x, y}) => ({x, y});

        const arr = col.map(getxy);
        // const arr2 = col2.map(getxy);
        // console.log('arr', arr, arr2);
        if (col?.length > 0) {
            const [p1, p2, p3, p4] = col;

            // Create triangles from point to player
            triangle = getTriangle(p3, p4, p1);
            triangle2 = getTriangle(p1, p2, p3);
            // this.path = new Path(p1.x, p1.y);
            // this.path.lineTo(p2);
            // this.path.lineTo(p3);
            // this.path.lineTo(p4);
            // this.path.closePath();

            // this.pathTriangle = triangle;
            // this.pathTriangle2 = triangle2;
        }

        // const { add } = this as unknown as Sce;

        // let canSeePlayer = true;

        // crates.children.iterate((crate: Crate) => {
        //
        //     const {body: crateBody} = crate;
        //
        //     const rect = new Rectangle(crate.x - crateBody.width / 2, crate.y - crateBody.height / 2, crateBody.width, crateBody.height);
        //     const prectSize = crateBody.width * 2;
        //     const pathCircle = new Circle(crate.x, crate.y, prectSize);
        //     const pathRect = new Rectangle(crate.x - prectSize / 2, crate.y - prectSize / 2, prectSize, prectSize);
        //     const bodyRect = new Rectangle(point.x - body.width / 2, point.y - body.height / 2, body.width, body.height);
        //     // this.collisionRect = bodyRect;
        //
        //     const reachSize = body.width;
        //     const bbox = {
        //         minX: crate.x - reachSize,
        //         minY: crate.y - reachSize,
        //         maxX: crate.x + reachSize,
        //         maxY: crate.y + reachSize,
        //     };
        //
        //     if (RectangleToTriangle(rect, triangle) || RectangleToTriangle(rect, triangle2)) {
        //         canSeePlayer = false;
        //         // get the point of intersection
        //         // const points = GetLineToCircle(line, pathCircle);
        //         // const points = GetLineToRectangle(line, pathRect);
        //
        //         // const corners =  pathRect.getPoints(4);
        //         // get the closest point
        //
        //         // path = pathRect.getPoints(4).map((item) => point2Vec(item));
        //         // this.path = new Path();
        //         // iterate Rectangle points
        //
        //         // check if the point is in the rectangle
        //
        //             // console.log(123, target);
        //
        //             // this.followPath(corners);
        //         // path = this.getSide(crate, pathRect);
        //
        //         const result = (tree as any).search(bbox).filter((item) => item.crate !== crate);
        //
        //         const reducer = (accumulator, currentValue) => ({
        //             top: currentValue.top < accumulator.top ? currentValue.top : accumulator.top,
        //             bottom: currentValue.bottom > accumulator.bottom ? currentValue.bottom : accumulator.bottom,
        //             left: currentValue.left < accumulator.left ? currentValue.left : accumulator.left,
        //             right: currentValue.right > accumulator.right ? currentValue.right : accumulator.right,
        //
        //         });
        //         const bounds = result?.length > 0 && result.reduce(reducer);
        //         if (bounds) {
        //             const rect = new Rectangle(bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top);
        //             // enlarge the rectangle
        //             const rect2 = new Rectangle(rect.x - prectSize / 1.5, rect.y - prectSize / 1.5, rect.width + prectSize, rect.height + prectSize);
        //
        //             this.follow(this.shape2Path(rect2.getPoints(20)));
        //         } else {
        //             const path = this.rect2Path(pathRect);
        //             // const path = this.circle2Path(pathCircle, 15);
        //             path && this.follow(path);
        //         }
        //
        //         // this.collisionRect = rect;
        //
        //         // const useCrate =  crate ; // result.length > 0 ? result[0].crate : crate;
        //         // this.collisionRect = useCrate.getBounds();
        //         // pathRect.setPosition(useCrate.x, useCrate.y);
        //         // const useRect = new Rectangle(useCrate.x - prectSize / 2, useCrate.y - prectSize / 2, prectSize, prectSize);
        //         // this.collisionRect = pathRect;
        //         // path = pathRect.getPoints(8).map((item) => point2Vec(item));
        //         // path = this.getSide(crate, pathRect);
        //
        //         // this.pathLine= pA;
        //         // console.log(path)
        //     }
        // });

        // if (canSeePlayer) {
        //     this.seek(player);
        // }

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
          unubscuredShapes.push({type: -2, shape: curve, color: handColor});
          this.drawShapes(unubscuredShapes);
          graphics.lineStyle(0, 0);
          }
      private getClosestPoint(point: Vector2, path: Vector2[]) {
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

    private pushCrateImpl(direction: string, crate: Crate) {
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
    private follow(path: Path) {
        // this.path = path;
        const { point } = this as unknown as PerspectiveMixinType;
        const getCurveLengths =  path.getCurveLengths();
        const lng = getCurveLengths[0];
        const totalLength = getCurveLengths[getCurveLengths.length - 1];
        let worldRecord = Infinity;
        let closestPoint;
        const getDelta = () => this.reverse ? -0.02 : 0.01;

        for (let i = 0; i < path.curves.length; i++) {
            // get line from curve

            const curve = path.curves[i];
            const start = curve.getStartPoint();
            const end = curve.getEndPoint();
            const distance = point.distance(start);
            if (distance < worldRecord) {
                worldRecord = distance;
                closestPoint = start;
            }
            const line = new Line(start.x, start.y, end.x, end.y);

            if (Phaser.Geom.Intersects.PointToLine(point, line, this.gridUnit * 1.25)) {
            // get the percentage of the line based on the point
            const percentage = ((i * lng) + Between(point.x, point.y, start.x, start.y)) / totalLength;

            if (this.reverse ? i > 0 :  i < path.curves.length - 1) {
                    const target = path.getPoint(percentage + getDelta());
                    this.seek(target);
                    break;

                } else {
                    // check if we reached the end of the path
                    if (percentage > 0.96) {
                        this.reverse = true;
                    }
                    if (percentage < 0.04) {
                        this.reverse = false;
                    }
                    const target = path.getPoint(percentage + getDelta());
                    this.seek(target);
                    break;
                }
            } else {
                // seek the closest point on the path
               this.seek(closestPoint);
            }
        }
    }

    // function that compares the distance between 2 points and a reference point and returns the furthest point
    private getFurthestPoint(a: Vector2, b: Vector2, point: Vector2) {
        // get the distance between the two points
        const distanceA = point.distance(a);
        const distanceB = point.distance(b);
        // return the furthest point
        return distanceA > distanceB ? b : a;
    }
    private rect2Path(pathRect: Rectangle) {
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
    private shape2Path(points) {
        // turn circle into path
        let path;
        this.path = path;

        for (let i = 0; i < points.length; i++) {
            const point = points[i];
            if (i === 0) {
                path = new Path(point[0], point[1]);
            } else {
                path.lineTo(point[0], point[1]);
            }
        }
        path.closePath();
        return path;
    }
    private seek(target: Vector2) {
        // set the velocity to the target
        const gameobject = this as unknown as GameObject;
        const body = gameobject.body as Physics.Arcade.Body;

        // get the center of the body
        const { point: center } = this as unknown as PerspectiveMixinType;

        const dir = target.clone().subtract(center);
        dir.normalize();
        dir.scale(this.speed);
        // this.collisionPoint = point2Vec(center);
        body.setVelocity(dir.x, dir.y);

    }
    // private seek(target: Vector2) {
    //     const { point } = this as unknown as PerspectiveMixinType;
    //     const desired = target.clone();
    //     desired.subtract(point);
    //     desired.normalize();
    //     const maxSpeed = new Vector2(this.speed, this.speed);
    //     // // Calculating the desired velocity to target at max speed
    //     desired.multiply(maxSpeed);
    //     // Reynolds’s formula for steering force
    //     const body = ((this as unknown as GameObject).body as Physics.Arcade.Body);
    //     const steer = desired.clone();
    //     steer.subtract(body.velocity);
    //     steer.limit(1);

    //     this.acceleration.add(steer);
    // }
}
