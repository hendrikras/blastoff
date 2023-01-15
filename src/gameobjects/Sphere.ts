import {Scene} from 'phaser';
import Wall from './Wall';
import {point2Vec, pyt, calculateCircleCenter} from '../helpers';
import {PerspectiveMixinType} from './PerspectiveMixin';
import Ellipse = Phaser.Curves.Ellipse;
import Vector2 = Phaser.Math.Vector2;
import Circle = Phaser.Geom.Circle;
import RadToDeg = Phaser.Math.RadToDeg;
import Normalize = Phaser.Math.Angle.Normalize;
import BetweenPoints = Phaser.Math.Angle.BetweenPoints;
import Line = Phaser.Geom.Line;
import GetCircleToCircle = Phaser.Geom.Intersects.GetCircleToCircle;

export default class extends Wall {
    get pi2(): number {
        return this.$pi2;
    }
    get isObscured(): (point: Phaser.Math.Vector2) => boolean {
        return this.$isObscured;
    }
    get meridian(): Phaser.Curves.Ellipse {
        return this.$meridian;
    }
    get equator(): Ellipse {
        return this.$equator;
    }
    get shape(): Circle {
        return this.circle;
    }
    private $pi2: number;
    private $equator: Ellipse;
    private $meridian: Ellipse;
    private angle2VP: number;
    private angle2VPRad: number;
    private circle: Circle;
    private radius: number;
    private $equatorAxis: Line;
    private $isObscured;
    constructor(scene: Scene, x: number , y: number, w: number, h: number, d, color: number, up = false, down = false, left = false, right = false) {
        super(scene, x, y, w, h, d, color, 'sphere', {none: false, up, down, right, left});
        this.alpha = 0;
        this.radius = w / 2;
        this.$pi2 = 2 * Math.PI;
    }
    public getSlice(axis, perc) {
        const {centerCenter, point, graphics} = this as unknown as PerspectiveMixinType;
        const ellipse = axis === 'x' ? this.$equator : this.$meridian;
        const lerp = axis === 'x' ? point :  this.equator.getPoint(0);
        const distance = this.radius * perc;
        const size = pyt(distance, this.radius);
        const position = centerCenter.clone().lerp(lerp, perc);

        const areaCircle = new Circle(position.x, position.y, size);
        let intersection;
        intersection = GetCircleToCircle(areaCircle, this.circle, intersection);
        const curve = new Ellipse(position.x, position.y, ellipse[`${axis}Radius`] / (this.radius / size), size, 0, 360, true , this.angle2VP);
        let isObscured = (b) => false;
        if (intersection.length > 0) {
             const p1 = point2Vec(intersection[0]);
             const p2 = point2Vec(intersection[1]);

             const middle = p1.lerp(p2, 0.5);
             isObscured = (p: Vector2) => middle.distance(p) <= p1.distance(p2) && intersection;
        }
        // curve.draw(graphics);
        return {curve, isObscured};
    }
    public update() {
        (this as unknown as PerspectiveMixinType).predraw(); // causality
        const { vertices: v, centerCenter, vanishPoint, point, gridUnit, graphics } = this as unknown as PerspectiveMixinType;
        graphics.clear();
        graphics.setDepth(4);
        const newCircle = new Circle(centerCenter.x, centerCenter.y, this.radius);
        this.circle = newCircle;

        const bp = BetweenPoints(vanishPoint, point);
        this.angle2VPRad = bp / this.$pi2;
        this.angle2VP = RadToDeg(bp);

        const {x: xRadius, y: yRadius} = this.getPlanes(centerCenter, point, newCircle);

        this.$equator = new Ellipse(centerCenter.x, centerCenter.y, xRadius, this.radius, 0, 1, true,  this.angle2VP);
        this.$meridian = new Ellipse(centerCenter.x, centerCenter.y, yRadius, this.radius, 0, 1, true, this.angle2VP);

        // this.equator.draw(graphics);
        graphics.fillStyle(0xFFF000);
        const eqautorAxis1 = this.equator.getPoint(0.25);
        const eqautorAxis2 = this.equator.getPoint(0.75);
        const midPoint = this.equator.getPoint(0.5).lerp(centerCenter, 0.5);
        const middle = calculateCircleCenter(eqautorAxis1, eqautorAxis2, midPoint);
        const start = newCircle.getPoint(0.5);
        const end = newCircle.getPoint(1);
        this.$isObscured = (p: Vector2) => middle.distance(p) <= eqautorAxis1.distance(eqautorAxis2) && [eqautorAxis1, eqautorAxis2];

        this.$equatorAxis = new Line(eqautorAxis1.x, eqautorAxis2.y, eqautorAxis2.x, eqautorAxis2.y);

        // graphics.strokeCircleShape(areaCircle);
        // this.meridian.draw(graphics);
    }

    private getPlanes(center, pole, circle) {
        const l = center.distance(pole);
        const s = pyt(l, circle.radius);
        const angle = Normalize(Line.Angle(new Line(s, l))) / this.$pi2;
        const mirror =  (angle + 0.5) % 1;
        const a = circle.getPoint(angle);
        const b = circle.getPoint(mirror);
        const y = (b.y - a.y ) / 2;
        const x = (b.x - a.x ) / 2;

        return new Vector2(x, y);
    }
}
