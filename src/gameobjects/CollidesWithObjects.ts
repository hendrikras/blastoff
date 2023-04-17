import {Physics, Types, GameObjects} from 'phaser';
import Crate from './Crate';
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite';
import {PerspectiveMixinType} from './PerspectiveMixin';
import CIRCLE = Phaser.Geom.CIRCLE;
import ELLIPSE = Phaser.Geom.ELLIPSE;
import {Direction, getHomoTheticCenter, lineIntersect, point2Vec, pyt, unblockBut} from '../helpers';
import Normalize = Phaser.Math.Angle.Normalize;
import BetweenPoints = Phaser.Math.Angle.BetweenPoints;
import GetCircleToCircle = Phaser.Geom.Intersects.GetCircleToCircle;
import Line = Phaser.Geom.Line;
import Vector2 = Phaser.Math.Vector2;
import Circle = Phaser.Geom.Circle;
import LINE = Phaser.Geom.LINE;
import Path = Phaser.Curves.Path;
import QuadraticBezier = Phaser.Curves.QuadraticBezier;
import RadToDeg = Phaser.Math.RadToDeg;
import DegToRad = Phaser.Math.DegToRad;
import SphereClass from './Sphere';
import {Point} from '../plugins/navmesh/src/common-types';
import Rectangle = Phaser.Geom.Rectangle;
import LineToLine = Phaser.Geom.Intersects.LineToLine;
import GameObject = Phaser.GameObjects.GameObject;
import Body = Phaser.Physics.Arcade.Body;

type BodyCollision = Types.Physics.Arcade.ArcadeBodyCollision;
export type SphereType =  PerspectiveMixinType & SphereClass;

export default class CollidesWithObjects extends ContainerLite implements PerspectiveMixinType {
    set falling(falling: BodyCollision) {
        this.gForce = falling;
    }
    get falling() {
        return this.gForce;
    }
    get surface() {
        return this.onPlatform;
    }
    set surface(platform) {
        this.onPlatform = platform;
    }
    public gridUnit: number;
    public vertices: Vector2[];
    public vanishPoint: Vector2;
    public dimensions: Vector2;
    public point: Vector2;
    public centerBottom: Vector2;
    public centerCenter: Vector2;
    public centerUp: Vector2;
    public centerDown: Vector2;
    public point7: Vector2;
    public graphics: GameObjects.Graphics;
    public draw: () => void;
    public pastCenter: (a: string) => boolean;
    public mp: () => void;
    public color: number;
    public predraw: () => void;
    public drawVertices: (faceByDirection: Vector2[]) => void;
    public getFaceByDirection: (direction: Direction) => Vector2[];
    public drawInView: () => void;
    public dp: (p: Vector2) => void;
    protected distanceToBoxCorner: number;
    protected pushedCrate: Crate | null;
    protected blockedDirection: BodyCollision = { up: false, down: false, right: false, left: false, none: true };
    protected lastDirection: number;
    protected head: SphereType;
    protected gForce: BodyCollision;
    protected onPlatform?: GameObject | boolean;

    constructor(scene, x: number, y: number, size: number, scale: number) {
        super(scene, x, y, size, size);
        scene.add.existing(this);
        scene.physics.world.enable(this);
        this.lastDirection = Math.PI / 2;
        this.gForce = {none: true} as BodyCollision;
    }
    public isBlockedDirection(direction: string) {
        return this.blockedDirection[direction];
    }
    public pushCrate = (dir: string, crate: Crate) => console.error('not implemented!');
    public setFalling(falling: BodyCollision) {
        this.gForce = falling;
        if (this.surface === undefined) {
            this.surface = false;
        }
    }
    protected resetBlockedDirections = (crate?: Crate) => {
        if (crate) {
            if (this.surface === false) {
                this.surface = crate;
            }
            unblockBut(Direction[this.facingSide(crate)], this.blockedDirection);
        } else {
            this.blockedDirection = {up: false, left: false, right: false, down: false, none: true };
        }
    }
    protected facingSide(crate: Crate): Direction {

        const { point: { x, y } } = this;
        const {width, height} = crate.body as Body;
        const rect = new Rectangle(x - width / 2, y - height / 2, width, height);
        const right = rect.getLineA();
        const top = rect.getLineB();
        const left = rect.getLineC();
        const bottom = rect.getLineD();

        const directions: Line[] = [bottom, left, top, right];
        const directionStrings: string[] = ['left', 'down', 'right', 'up'];
        const line = new Line(x, y, crate.x, crate.y);
        const closest = directions.findIndex((dir) => LineToLine(line, dir));

        if (closest === -1) {
          throw new Error('No direction found');
        }

        return Direction[directionStrings[closest]];
      }
    protected handleCrateCollison = (crate: Crate) => {
        const dir = Direction[this.facingSide(crate)];

        if (dir) {
            this.pushCrate(dir, crate);
        }

    }
    protected getTrepazoid(circle1, circle2, color, percent, intersectPoint: Vector2 | null = null, strokeColor = -1) {
        const { graphics, point } = this as unknown as PerspectiveMixinType;
        let cross;
        if (!intersectPoint) {
            cross = getHomoTheticCenter(circle1, circle2);
            if (cross === null) {
                return;
            }
            graphics.lineStyle(3, 0x000, 1);
        } else {
            cross = intersectPoint;
        }

        const tp = this.getExternalTangent(circle1, circle2, cross);

        if (tp?.length > 0 && cross) {
            const [p1, p2, p3, p4] = tp;
            const shape = new Path(p1.x, p1.y);
            const mi = cross.clone().lerp(point, percent);
            const curve = new QuadraticBezier(point2Vec(p1), mi, point2Vec(p2));
            shape.add(curve);
            shape.lineTo(p2.x, p2.y);
            shape.lineTo(p3.x, p3.y);
            shape.lineTo(p4.x , p4.y);

            shape.closePath();

            return {type: -3, shape, color, strokeColor, points: {p1, p2, p3, p4}};
        }
    }
    protected drawShapes(items) {

        items.forEach(({type, shape, color = -1, strokeColor = -1, lineWidth = this.gridUnit / 4}) => {
            const {graphics} = this as unknown as PerspectiveMixinType;
            if (type === CIRCLE) {
                if (color !== -1) {
                    graphics.fillStyle(color, 1);
                    graphics.fillCircleShape(shape);
                }
                if (strokeColor !== -1) {
                    graphics.lineStyle(lineWidth, strokeColor, 1);
                    graphics.strokeCircleShape(shape);
                }
            } else if (type === ELLIPSE) {
                graphics.fillStyle(color, 1);
                graphics.fillEllipseShape(shape);
            } else if (type === LINE) {
                graphics.lineStyle(lineWidth, color, 1);
                graphics.strokeLineShape(shape);
            } else if (type === -2) {
                graphics.lineStyle(this.gridUnit / 4, color, 1);
                graphics.strokePoints(shape.getPoints());
            } else if (type === -1) {
                const {x, y, radius, startAngle, endAngle, anticlockwise} = shape;
                graphics.beginPath();
                graphics.lineStyle(lineWidth, strokeColor, 1);

                graphics.fillStyle(color, 1);
                graphics.arc(x, y, radius, startAngle, endAngle, anticlockwise);
                graphics.fillPath();
                if (strokeColor !== -1) {
                    graphics.strokePath();
                }
            } else {
                graphics.fillStyle(color, 1);
                graphics.lineStyle(this.gridUnit / 4, strokeColor, 1);
                graphics.fillPoints(shape.getPoints());
                if (strokeColor !== -1) {
                    const points = shape.getPoints();
                    // first point is also the last point
                    points.push(points[0]);
                    graphics.strokePoints(points);
                    graphics.strokePoints(shape.getPoints());

                }
            }
        });
        items?.shape?.destroy();
    }
    protected getBodyAngle() {
        const gameObject = (this as unknown as GameObjects.GameObject);
        const body = (gameObject.body as Physics.Arcade.Body);
        if (body.speed > 0) {
            this.lastDirection = body.angle;
            return body.angle;
        } else {
            return this.lastDirection;
        }
    }

    protected getExternalTangent(circle1, circle2, homoTheticCenter): Vector2[] {
        if (circle1 && circle2 && homoTheticCenter) {
            const { graphics } = this as unknown as PerspectiveMixinType;
            graphics.fillStyle(0xb4d455, 1);
            graphics.lineStyle(4, 0x000, 1);
            const getAngle = (c) => Normalize(BetweenPoints(c, homoTheticCenter)) / (2 * Math.PI);
            const angle1 = (getAngle(circle1) + 0.25) % 1;
            const angle2 = (angle1 + 0.5) % 1;

            const angle3 = (getAngle(circle2) + 0.25) % 1;
            const angle4 = (angle3 + 0.5) % 1;
            const pp2 = circle1.getPoint(angle2);
            const pp4 = circle2.getPoint(angle4);
            const lineA = Phaser.Geom.Line.Extend(this.getLine(pp2, pp4), circle1.radius, circle1.radius);

            const intersectPoint = lineIntersect(lineA.getPointA(), lineA.getPointB(), circle1, homoTheticCenter) as Vector2;
            // tslint:disable-next-line:one-variable-per-declaration
            let intersects: Vector2[] = [];
            if (intersectPoint) {
                const halfpoint = point2Vec(circle2).lerp(intersectPoint, 0.5);
                const measureCircle = new Circle(halfpoint.x, halfpoint.y, halfpoint.distance(intersectPoint));
                intersects = GetCircleToCircle(measureCircle, circle2).map((p) => point2Vec(p));
                if (intersects?.length === 0) {
                     return [];
                }
                const [p1, p2] = intersects;
                const lineB = new Line(p1.x, p1.y, intersectPoint.x, intersectPoint.y);
                const lineC = new Line(p2.x, p2.y, intersectPoint.x, intersectPoint.y);
                const d = point2Vec(circle1).distance(circle2);
                const lineD = Phaser.Geom.Line.Extend(lineB, d, 0);
                const lineE = Phaser.Geom.Line.Extend(lineC, d, 0);
                const p4 = lineD.getPointA();
                const p3 = lineE.getPointA();
                intersects.push(p3);
                intersects.push(p4);

                return intersects;
            }
        }
        return [];

    }
    protected getLine = (p1, p2) => new Line(p1.x, p1.y, p2.x, p2.y);
    protected getDomeShape(position, radius) {
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
    protected convertToPath(points: Point[]) {
        const start = points.shift() as Vector2;
        const path = new Path(start.x, start.y);
        points?.length > 0 && points?.forEach(({x, y}) => {
            path.lineTo(x, y);
        });
        return path;
    }
  }
