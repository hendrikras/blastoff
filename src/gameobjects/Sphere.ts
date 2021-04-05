import {Scene} from 'phaser';
import Wall from './Wall';
import {lineIntersect, point2Vec, pyt} from '../helpers';
import PerspectiveMixin, {PerspectiveMixinType} from './PerspectiveMixin';
import Ellipse = Phaser.Curves.Ellipse;
import Vector2 = Phaser.Math.Vector2;
import Circle = Phaser.Geom.Circle;
import RotateAroundDistance = Phaser.Math.RotateAroundDistance;
import RadToDeg = Phaser.Math.RadToDeg;
import Normalize = Phaser.Math.Angle.Normalize;
import BetweenPoints = Phaser.Math.Angle.BetweenPoints;
import QuadraticBezier = Phaser.Curves.QuadraticBezier;
import DegToRad = Phaser.Math.DegToRad;
import Line = Phaser.Geom.Line;
import Triangle = Phaser.Geom.Triangle;
import Point = Phaser.Geom.Point;
export default class extends Wall {
    get meridian(): Phaser.Curves.Ellipse {
        return this.$meridian;
    }
    get equator(): Ellipse {
        return this.$equator;
    }
    private pi2: number;
    private size: number;
    private $equator: Ellipse;
    private $meridian: Ellipse;
    // @ts-ignore
    constructor(scene: Scene, x: number , y: number, w: number, h: number, d, color: number, up, down, left, right) {
        super(scene, x, y, w, h, d, color, 'sphere', {none: false, up, down, right, left});
        this.alpha = 0;
        this.size = w;
        this.pi2 = 2 * Math.PI;
    }

    private getPlanes(center, pole, circle, axis, perc = 1) {
        const l = center.distance(pole) * perc;
        const s = pyt(l, circle.radius * perc);
        const angle = Normalize(Line.Angle(new Line(s, l))) / this.pi2;
        const mirror =  (angle + 0.5) % 1;
        const a = circle.getPoint(angle);
        const b = circle.getPoint(mirror);

        return (b[axis] - a[axis] ) / 2;
    }
    private dp = (p: Vector2) => (this as unknown as PerspectiveMixinType).graphics.fillPoint(p.x, p.y, 3);

    public predrawSphere(angle, circle) {
        const { vertices: v, centerBottom, color, vanishPoint, point, x, y, dimensions, graphics, pastCenter} = this as unknown as PerspectiveMixinType;
        graphics.clear();

        const direction = Normalize(angle) / this.pi2;
        const perc = 0.3;

        const centerCenter = centerBottom.clone().lerp(point, 0.5).clone();
        const newCircle = new Circle(centerCenter.x, centerCenter.y, this.size / 2);
        graphics.fillCircleShape(newCircle);
        graphics.fillStyle(0xFFF000, 1);
        const rad = this.size / 2;
        const a = rad * perc;

        const size = pyt(a, rad);
        // const posCircle = new Circle(x, y, a);
        const cenCircle = new Circle(centerCenter.x, centerCenter.y, a);

        const position = point2Vec(cenCircle.getPoint(direction));

        const vang = RadToDeg(BetweenPoints(vanishPoint, point));
        const xRadius = this.getPlanes(centerCenter, point, newCircle, 'x');
        const yRadius = this.getPlanes(centerCenter, point, newCircle, 'y');

        this.$equator = new Ellipse(centerCenter.x, centerCenter.y, xRadius, this.size / 2, 0, 1, true,  vang);
        this.$meridian = new Ellipse(position.x, position.y, yRadius / (rad / size), size, 0, 1, true, RadToDeg(angle));
        // this.$equator.draw(graphics);
        // this.meridian.draw(graphics);
    }
}
