import { Physics, Types, GameObjects } from 'phaser';
import Crate from './Crate';
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite';
import {PerspectiveMixinType} from './PerspectiveMixin';
import CIRCLE = Phaser.Geom.CIRCLE;
import ELLIPSE = Phaser.Geom.ELLIPSE;
import {lineIntersect, point2Vec} from '../helpers';
import Normalize = Phaser.Math.Angle.Normalize;
import BetweenPoints = Phaser.Math.Angle.BetweenPoints;
import GetCircleToCircle = Phaser.Geom.Intersects.GetCircleToCircle;
import Line = Phaser.Geom.Line;
import Vector2 = Phaser.Math.Vector2;
import Circle = Phaser.Geom.Circle;

export default class CollidesWithObjects extends ContainerLite {
    protected distanceToBoxCorner: number;
    protected pushedCrate: Crate | null;
    protected gridUnit: number;
    protected xThreshold: number;
    protected yThreshold: number;
    protected blockedDirection: Types.Physics.Arcade.ArcadeBodyCollision = { up: false, down: false, right: false, left: false, none: true };
    constructor(scene, x: number, y: number, size: number, scale: number) {
        super(scene, x, y, size, size);

        // constructor(scene, x, y, width, height, children) {
        //     super(scene, x, y, width, height, children);
        // this.setSize(size, size);
        scene.add.existing(this);
        scene.physics.world.enable(this);
        // this.setScale(scale);

    }
    public pushCrate = (dir: string, crate: Crate) => console.error('not implemented!');
    protected hasReachedCrateCorner = (axis: string) => (this[`${axis}Threshold`] - this[axis] / this.gridUnit > this.distanceToBoxCorner || this[`${axis}Threshold`] - this[axis] / this.gridUnit < - this.distanceToBoxCorner);
    protected setCollidedObject(crate: Crate) {
      if (!this.distanceToBoxCorner) {
        this.distanceToBoxCorner = (this as unknown as GameObjects.Container).width + crate.width / 2;
      }
    }
    protected resetBlockedDirections = () =>  ['x', 'y'].forEach((axis: string) => {
        if (this.hasReachedCrateCorner(axis)) {
            axis === 'x' ? this.blockedDirection.down = false : this.blockedDirection.right = false;
            axis === 'x' ? this.blockedDirection.up = false : this.blockedDirection.left = false;
            this[`${axis}Threshold`] = this[axis];
        }
    })
    protected handleCrateCollison = (crate: Crate) => {
        const that = (this as unknown as GameObjects.Container);
        const relativeX = (crate.x / this.gridUnit - that.x / this.gridUnit);
        const relativeY = (crate.y / this.gridUnit - that.y / this.gridUnit );
        const edge = crate.body.height / 2;

        if (relativeY < edge && (relativeX < edge && relativeX > -edge) ) {
            this.pushCrate('up', crate);
        } else if (relativeY > edge && (relativeX < edge && relativeX > -edge)) {
            this.pushCrate('down', crate);
        } else if ( relativeX > edge && (relativeY < edge && relativeY > -edge) ) {
            this.pushCrate('right', crate);
        } else if ( relativeX < edge && (relativeY < edge && relativeY > -edge) ) {
            this.pushCrate('left', crate);
        }
    }

    protected drawShapes(items) {

        items.forEach(({type, shape, color}) => {
            const {graphics} = this as unknown as PerspectiveMixinType;
            if (type === CIRCLE) {
                graphics.fillStyle(color, 1);
                graphics.fillCircleShape(shape);
            } else if (type === ELLIPSE) {
                graphics.fillStyle(color, 1);
                graphics.fillEllipseShape(shape);
            } else if (type === -3) {
                graphics.fillStyle(color, 1);
                graphics.fillPoints(shape.getPoints());
                // graphics.strokePoints(shape.getPoints());

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
                graphics.lineStyle(this.gridUnit / 4, color, 1);
                graphics.strokeLineShape(shape);

            }
        });
        items?.shape?.destroy();
    }
    protected getExternalTangent(circle1, circle2, crossPoint) {
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
    private getLine(p1, p2) {
        const line = new Line(p1.x, p1.y, p2.x, p2.y);
        return line;
    }
  }
