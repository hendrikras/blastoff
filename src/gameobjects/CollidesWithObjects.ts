import { Physics, Types, GameObjects } from 'phaser';
import Crate from './Crate';
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite';
import {PerspectiveMixinType} from './PerspectiveMixin';
import CIRCLE = Phaser.Geom.CIRCLE;
import ELLIPSE = Phaser.Geom.ELLIPSE;
import {lineIntersect, point2Vec, unblockBut} from '../helpers';
import Normalize = Phaser.Math.Angle.Normalize;
import BetweenPoints = Phaser.Math.Angle.BetweenPoints;
import GetCircleToCircle = Phaser.Geom.Intersects.GetCircleToCircle;
import Line = Phaser.Geom.Line;
import Vector2 = Phaser.Math.Vector2;
import Circle = Phaser.Geom.Circle;
import LINE = Phaser.Geom.LINE;
import Path = Phaser.Curves.Path;
import QuadraticBezier = Phaser.Curves.QuadraticBezier;

export default class CollidesWithObjects extends ContainerLite {
    protected distanceToBoxCorner: number;
    protected pushedCrate: Crate | null;
    protected gridUnit: number;
    protected blockedDirection: Types.Physics.Arcade.ArcadeBodyCollision = { up: false, down: false, right: false, left: false, none: true };
    constructor(scene, x: number, y: number, size: number, scale: number) {
        super(scene, x, y, size, size);
        scene.add.existing(this);
        scene.physics.world.enable(this);
    }
    public pushCrate = (dir: string, crate: Crate) => console.error('not implemented!');
    protected resetBlockedDirections = (angle) => {
        if (angle > 0.78 && angle < 2.29 ) {
            unblockBut('up', this.blockedDirection);
        } else if (angle > -2.29 && angle < -0.78 ) {
            unblockBut('down', this.blockedDirection);

        } else if (angle > -0.79 && angle < 0.78 ) {
            unblockBut('left', this.blockedDirection);

        } else {
            unblockBut('right', this.blockedDirection);
        }
    }
    protected handleCrateCollison = (crate: Crate) => {
        const { point } = this as unknown as PerspectiveMixinType;
        const angle = BetweenPoints(crate, point);
        if (angle > 0.78 && angle < 2.29 ) {
            this.pushCrate('up', crate);
        } else if (angle > -2.29 && angle < -0.78 ) {
            this.pushCrate('down', crate);
        } else if (angle > -0.79 && angle < 0.78 ) {
            this.pushCrate('left', crate);
        } else {
            this.pushCrate('right', crate);
        }
    }
    protected getTrepazoid(circle1, circle2, color, percent, intersectPoint: Vector2 | null = null) {
        const { graphics, point } = this as unknown as PerspectiveMixinType;
        let cross;
        if (!intersectPoint) {
            const ext = new Line(circle1.x, circle1.y, circle2.x, circle2.y);
            const crossb = Phaser.Geom.Line.Extend(ext, 0, this.gridUnit * 40);
            const cp = point2Vec(circle1.getPoint(0));
            const cp2 = point2Vec(circle2.getPoint(0));
            const crossa = Phaser.Geom.Line.Extend(new Line(cp.x, cp.y, cp2.x, cp2.y), this.gridUnit * 40);
            cross = lineIntersect(crossb.getPointA(), crossb.getPointB(), crossa.getPointA(), crossa.getPointB());
            graphics.lineStyle(3, 0x000, 1);
        } else {
            cross = intersectPoint;
        }

        const tp = this.getExternalTangent(circle1, circle2, cross);
        if (tp && cross) {
            const {p1, p2, p3, p4} = tp;
            const shape = new Path();
            shape.moveTo(p1);
            shape.lineTo(p2);
            shape.lineTo(p4);
            shape.lineTo(p3);
            const mi = cross.clone().lerp(point, percent);
            if (!intersectPoint) {
                const curve = new QuadraticBezier(p1, mi, p2);
                shape.add(curve);
            }
            shape.closePath();

            return {type: -3, shape, color};
        }
    }
    protected drawShapes(items) {

        items.forEach(({type, shape, color, strokeColor, lineWidth = this.gridUnit / 4}) => {
            const {graphics} = this as unknown as PerspectiveMixinType;
            if (type === CIRCLE) {
                graphics.fillStyle(color, 1);
                graphics.fillCircleShape(shape);
                if (strokeColor) {
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
                graphics.fillStyle(color, 1);
                graphics.arc(x, y, radius, startAngle, endAngle, anticlockwise);
                graphics.fillPath();
            } else {
                graphics.fillStyle(color, 1);
                graphics.fillPoints(shape.getPoints());
            }
        });
        items?.shape?.destroy();
    }
    protected getExternalTangent(circle1, circle2, crossPoint) {
        if (circle1 && circle2 && crossPoint) {
            const { graphics } = this as unknown as PerspectiveMixinType;
            graphics.fillStyle(0xb4d455, 1);
            graphics.lineStyle(4, 0x000, 1);
            const getAngle = (c) => Normalize(BetweenPoints(c, crossPoint)) / (2 * Math.PI);
            const angle1 = (getAngle(circle1) + 0.25) % 1;
            const angle2 = (angle1 + 0.5) % 1;

            const angle3 = (getAngle(circle2) + 0.25) % 1;
            const angle4 = (angle3 + 0.5) % 1;
            const pp2 = circle1.getPoint(angle2);
            const pp4 = circle2.getPoint(angle4);
            const lineA = Phaser.Geom.Line.Extend(this.getLine(pp2, pp4), circle1.radius, circle1.radius);

            const intersectPoint = lineIntersect(lineA.getPointA(), lineA.getPointB(), circle1, crossPoint) as Vector2;
            // tslint:disable-next-line:one-variable-per-declaration
            let p1, p2, p3, p4, intersects;
            if (intersectPoint) {
                const halfpoint = point2Vec(circle2).lerp(intersectPoint, 0.5);
                const measureCircle = new Circle(halfpoint.x, halfpoint.y, halfpoint.distance(intersectPoint));
                intersects = GetCircleToCircle(measureCircle, circle2);
            }
            if (intersects?.length > 0) {
                p1 = intersects[0];
                p2 = intersects[1];
                const lineB = new Line(p1.x, p1.y, intersectPoint.x, intersectPoint.y);
                const lineC = new Line(p2.x, p2.y, intersectPoint.x, intersectPoint.y);
                const d = point2Vec(circle1).distance(circle2);
                const lineD = Phaser.Geom.Line.Extend(lineB, d, 0);
                const lineE = Phaser.Geom.Line.Extend(lineC, d, 0);
                p3 = lineD.getPointA();
                p4 = lineE.getPointA();
            }

            const result = {p1, p2, p3, p4};
            return p1 && p2 && p3 && p4 ? result : false;
        }
        return false;
    }
    private getLine(p1, p2) {
        const line = new Line(p1.x, p1.y, p2.x, p2.y);
        return line;
    }
  }
