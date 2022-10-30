import {GameObjects, Physics, Types} from 'phaser';
import {
    collidesOnAxes,
    getArcCurve,
    getArcShape,
    getNavMesh,
    getTriangle,
    impassable,
    point2Vec,
    setPosition,
    ShapeCollectionItem,
} from '../helpers';

import Crate from './Crate';
import CollidesWithObjects from './CollidesWithObjects';
import ArcadeBodyBounds = Phaser.Types.Physics.Arcade.ArcadeBodyBounds;
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite';
import Circle = Phaser.Geom.Circle;
import Vector2 = Phaser.Math.Vector2;
import BetweenPoints = Phaser.Math.Angle.BetweenPoints;
import Normalize = Phaser.Math.Angle.Normalize;

import PerspectiveObject, {PerspectiveMixinType} from '../gameobjects/PerspectiveMixin';
import SphereClass from './Sphere';
import CIRCLE = Phaser.Geom.CIRCLE;
import TRIANGLE = Phaser.Geom.TRIANGLE;
import LINE = Phaser.Geom.LINE;
import Shape = Phaser.GameObjects.Shape;
import GameObject = Phaser.GameObjects.GameObject;
import Polygon from '../plugins/gpc';
import {Point} from '../plugins/navmesh/src/common-types';
import Enemy from './Enemy';
import Wall from './Wall';
import Sprite = Phaser.Physics.Arcade.Sprite;

export default class Player extends CollidesWithObjects {
    private speed;
    private hasInput: boolean;
    private cursorKeys: Types.Input.Keyboard.CursorKeys;
    private pace: number = 30;
    private crates: Crate[];
    private allCrates: Physics.Arcade.Group;
    private factor: number = (this.pace / 10) * 2.5;
    private worldBounds: ArcadeBodyBounds;

    private center: Circle;
    private reach: Circle;
    private shadow: Circle;
    private feetCircle: Circle;
    private shoe1: Shape;
    private shoe1Counter: number;
    private shoe2: Shape;
    private face: Sprite;
    private dress: Sprite;
    private expression: Sprite;
    private color: number;
    private size: number;
    private pathHelper: Circle;
    private step: number;
    private now: number;
    private enemy: Enemy;
    private max: number;
    private frame = 0;
    private reverseAnimation = false;

    constructor(config, gridUnit: number, crates: Physics.Arcade.Group, size, enemy: Enemy) {
        super(config.scene, config.x, config.y, size, size);
        const body = ((this as unknown as GameObject).body as Physics.Arcade.Body);
        body.setCollideWorldBounds(true);
        this.enemy = enemy;
        this.allCrates = crates;
        (this as ContainerLite).scene = config.scene;
        const container = this as unknown as ContainerLite;
        const {x, y} = config;
        this.color = 0XEFCAB7;
        const shadowColor = 0X031920;
        this.size = size;
        this.shadow = config.scene.add.circle(x, y, size, shadowColor, 0.4);
        // this.image = this.physics.add.sprite(getGameWidth(this) / 2, getGameHeight(this) / 2, 'man');
        // const fallFace =
        const quarter = size * 1.8;
        this.shoe1Counter = 0;
        this.step = +1;
        this.now = 0;
        const Sphere = PerspectiveObject(SphereClass);
        this.head = new Sphere(config.scene, x, y, quarter, quarter, quarter, this.color);
        this.head.setDepth(2);

        // fallFace.displayHeight = this.head.height;
        // fallFace.displayWidth = this.head.width;
        const shoeColor = 0xAD661F;
        const shoeStyle = [this.size / 5, 0x663300, 1];
        this.shoe1 = config.scene.add.rexRoundRectangle(x, y, size * 2, size, size / 2, shoeColor);
        this.shoe1.setStrokeStyle(...shoeStyle);
        this.shoe1.setScale(0.5);
        this.shoe2 = config.scene.add.rexRoundRectangle(x, y, size * 2, size, size / 2, shoeColor);
        this.shoe2.setScale(0.5);
        this.shoe2.setStrokeStyle(...shoeStyle);
        this.center = new Circle(x, y, size * 1.1);
        this.reach = new Circle(x, y, size * 1.3);
        this.pathHelper = new Circle(x, y, size);
        this.feetCircle = new Circle(x, y, size);
        this.face = config.scene.add.sprite(x, y, 'hair');
        this.dress = config.scene.add.sprite(x, y, 'torso');
        this.expression = config.scene.add.tileSprite(x, y, this.gridUnit, this.gridUnit, 'expressions');
        this.face.setVisible(false);
        this.face.setScale(size / 180);
        this.dress.setScale(size / 400);
        this.expression.setScale(size / 1000);
        this.expression.setFrame(1);
        container.add(this.shadow as unknown as GameObject);
        container.add(this.shoe1);
        container.add(this.shoe2);
        container.add(this.face);
        container.add(this.expression);
        container.add(this.dress);
        const faceOffset = gridUnit * 2;
        const dressOffset = gridUnit / 1.5;
        container.setChildLocalPosition(this.face, 0,  -faceOffset);
        container.setChildLocalPosition(this.expression, 0,  -faceOffset);
        container.setChildLocalPosition(this.dress, 0,  -dressOffset);
        // that.setScale(0.2);
        this.face.setDepth(3);
        this.dress.setVisible(false);
        this.expression.setVisible(false);
        this.face.setVisible(false);
        this.expression.setDepth(3);
        this.shoe1.depth = 0;
        this.shoe2.depth = 0;

        this.crates = crates.children.getArray() as Crate[];
        this.speed = gridUnit * this.pace;
        this.gridUnit = gridUnit / 10;
        this.cursorKeys = config.scene.input.keyboard.createCursorKeys();
        this.pushCrate = this.pushCrateImpl;
        this.worldBounds = config.scene.physics.world.bounds;
        const w = this.worldBounds.right - this.worldBounds.x;
        const h = this.worldBounds.bottom - this.worldBounds.y;
        this.max = h > w ? h : w;
    }

    public isMoving() {
        return this.hasInput;
    }

    public update() {

        this.hasInput = false;
        const that = this as unknown as PerspectiveMixinType;
        that.graphics.clear();
        const obscuredShapes: ShapeCollectionItem[] = [];
        const unubscuredShapes: ShapeCollectionItem[] = [];
        const container = this as unknown as ContainerLite;
        that.predraw();
        const {dp, graphics, point, centerBottom, centerCenter, centerUp, point7, vertices, vanishPoint} = that;
        setPosition(this.pathHelper, that);
        setPosition(this.center, this.gForce.none ? centerCenter : point);
        setPosition(this.head, point);
        setPosition(this.reach, point);
        this.head.update();
        const {equator, pi2: all} = this.head as unknown as SphereClass;
        const {curve: eyeTopLine} = this.head.getSlice('x', 0.8);
        const {curve: eyeCenterLine} = this.head.getSlice('x', 0.65);
        const {curve: eyeBottomLine} = this.head.getSlice('x', 0.4);
        container.setChildPosition(this.shadow as unknown as GameObject, centerBottom.x, centerBottom.y);
        (this.shadow as any).depth = 0;
        this.shoe1.depth = 0;
        this.shoe2.depth = 0;
        graphics.setDepth(2);

        const bodyAngle = this.getBodyAngle();
        const direction = Normalize(bodyAngle) / all;

        const relativeAngle = Normalize(BetweenPoints(vanishPoint, point)) / all;
        (this as ContainerLite).setChildRotation(this.shoe1, bodyAngle);
        (this as ContainerLite).setChildRotation(this.shoe2, bodyAngle);

        graphics.fillStyle(this.color);
        graphics.fillStyle(this.color, 1);
        graphics.fillPath();
        const nose = relativeAngle - direction;
        const eye1Angle = nose - 0.94 % 1;
        const eye2Angle = nose + 0.94 % 1;
        const eye1AngleB = nose - 0.94 % 1;
        const eye2AngleB = nose + 0.94 % 1;
        const cheek1 = nose - 0.12 % 1;
        const cheek2 = nose + 0.12 % 1;
        const faceFeatColor = 0xFFFFFF;

        const eye1Bottom = eyeBottomLine.getPoint(eye1AngleB);
        const eye2Bottom = eyeBottomLine.getPoint(eye2AngleB);
        const eyeTop = eyeTopLine.getPoint(eye1Angle);
        const eye1Center = eyeCenterLine.getPoint(eye1Angle);
        const eye2Center = eyeCenterLine.getPoint(eye2Angle);

        const nosePoint = eyeBottomLine.getPoint(nose);
        const mouthPoint = equator.getPoint(nose).lerp(nosePoint, 0.4);
        const eye1Distance = eyeTop.distance(eye1Bottom);
        const eye2Distance = eyeTop.distance(eye2Bottom);

        const line1 = 2.2 - (eye1Distance / this.gridUnit);
        const line2 = 1.8 - (eye2Distance / this.gridUnit);
        const eyeWidth = this.gridUnit * 0.5;
        const irisSize = this.gridUnit * 0.25;
        const eye1 = getArcShape(eye1Center, eyeWidth, line2, line1, bodyAngle);
        const eye1Iris = getArcShape(eye1Center, irisSize, line2, line1, bodyAngle);
        const eye2 = getArcShape(eye2Center, eyeWidth, line1, line2, bodyAngle);
        const eye2Iris = getArcShape(eye2Center, irisSize, line1, line2, bodyAngle);

        const irisColor = 0x357388;
        this.walk(direction);
        const lineWidth = this.gridUnit / 10;
        const topColor = 0x6d8cac;

        if (!this.surface && (this.gForce.down || this.gForce.up)) {
            this.blockedDirection.left = true;
            this.blockedDirection.right = true;
        }
        let skirt;
        let torso;
        const bottomColor = 0x436b94;

        if (this.gForce.none && !this.surface) {
            setPosition(this.feetCircle, centerBottom);
            unubscuredShapes.push({type: -1, shape: eye1, color: 0xFFFFFF, strokeColor: 0x000, lineWidth});
            unubscuredShapes.push({type: -1, shape: eye1Iris, color: irisColor, strokeColor: 0x000, lineWidth});
            unubscuredShapes.push({type: -1, shape: eye2, color: 0xFFFFFF, strokeColor: 0x000, lineWidth});
            unubscuredShapes.push({type: -1, shape: eye2Iris, color: irisColor, strokeColor: 0x000, lineWidth});
            unubscuredShapes.push({type: CIRCLE, strokeColor: 0x000, shape: this.head.shape});
            unubscuredShapes.push({
                type: -1,
                color: this.color,
                strokeColor: 0x000,
                lineWidth: this.gridUnit / 10,
                shape: this.getDomeShape(nosePoint, this.gridUnit * 0.35),
            });
            torso = new Circle(centerCenter.x, centerCenter.y, this.gridUnit * 2);
            const skirtLength = centerCenter.clone().lerp(centerBottom, 0.7);
            skirt = this.getTrepazoid(this.pathHelper, new Circle(skirtLength.x, skirtLength.y, this.gridUnit * 2.55), bottomColor, 0.97, null, 0x000);

        } else {
            const v4 = vertices[4];
            const v5 = vertices[5];
            const v6 = vertices[6];
            const v7 = point7;
            const leftShoulder = v4.clone().lerp(v5, 0.5);
            const rightShoulder = v6.clone().lerp(v7, 0.5);
            torso = new Circle(centerUp.x, centerUp.y, this.gridUnit * 2);
            const points = [leftShoulder,  rightShoulder, centerCenter, leftShoulder];
            skirt = {type: TRIANGLE, color: topColor, shape: this.convertToPath(points), strokeColor: 0x000};
            // skirt = this.getTrepazoid(this.pathHelper, new Circle(this.center.x, this.center.y, this.gridUnit * 2.55), bottomColor, 0.97, null, 0x000);

        }
        if (skirt) {
            obscuredShapes.push(skirt);
        }
        // obscuredShapes.push({type: CIRCLE, color: topColor, shape: torso, strokeColor: 0x000});

        let handPos1;
        let handPos2;
        const rightHand =  (direction + 0.25) % 1;
        const leftHand = (direction + 0.75) % 1;

        if (this.falling.down) {
            // this.dress.setVisible(true);
            if (!this.surface) {
                if (!this.reverseAnimation) {
                    this.frame += 20;
                    if (this.frame === 100) {
                        this.reverseAnimation = true;
                    }
                } else {
                    this.frame -= 20;
                    if (this.frame === 0) {
                        this.reverseAnimation = false;
                    }
                }
                handPos1 = new Vector2(Circle.GetPoint(this.reach, 0 + this.frame / 1000));
                handPos2 = new Vector2(Circle.GetPoint(this.reach, 0.5 + this.frame / 1000));
            } else {
                handPos1 = this.center;
                handPos2 = this.center;
            }
        } else {
            handPos1 = new Vector2(Circle.GetPoint(this.center, rightHand));
            handPos2 = new Vector2(Circle.GetPoint(this.center, leftHand));
            if (this.pushedCrate && this.pushedCrate instanceof Crate && point2Vec(this.pushedCrate).distance(point) < this.size * 4.5) {
                const {centerCenter: center} = this.head as unknown as PerspectiveMixinType;
                const circle = new Circle(center.x, center.y, this.size * 1.4);
                const a2 = (direction + 0.1) % 1;
                const b2 = (direction + 0.9) % 1;
                handPos1 = point2Vec(circle.getPoint(a2));
                handPos2 = point2Vec(circle.getPoint(b2));
            } else {
                this.pushedCrate = null;
            }
        }
        if (this.surface !== false) {
            this.resetBlockedDirections();
        }

        obscuredShapes.push({
            type: CIRCLE,
            color: this.color,
            shape: new Circle(handPos1.x, handPos1.y, this.gridUnit * 0.8),
            strokeColor: 0x000,
        });
        obscuredShapes.push({
            type: CIRCLE,
            color: this.color,
            shape: new Circle(handPos2.x, handPos2.y, this.gridUnit * 0.8),
            strokeColor: 0x000,
        });

        const relAngDir = relativeAngle - direction;
        let shoulder1Point: Point;
        let shoulder2Point: Point;
        if (!this.falling.down) {
            shoulder1Point = equator.getPoint(relAngDir - 0.25 % 1);
            shoulder2Point = equator.getPoint(relAngDir - 0.75 % 1);
        } else {
            if (this.surface) {
                shoulder1Point = this.center.getPoint( 0.75);
                shoulder2Point = this.center.getPoint( 0.75);
            } else {
                shoulder1Point = this.center.getPoint( rightHand);
                shoulder2Point = this.center.getPoint( leftHand);
            }
          }

        const arm1Line = this.getLine(shoulder1Point, handPos1);
        const arm2Line = this.getLine(shoulder2Point, handPos2);
        const arm1 = {type: LINE, shape: arm1Line, color: topColor, lineWidth: this.gridUnit * 1.2};
        const arm1Outline = {type: LINE, shape: arm1Line, color: 0x000, lineWidth: this.gridUnit * 1.8};
        const arm2 = {type: LINE, shape: arm2Line, color: topColor, lineWidth: this.gridUnit * 1.2};
        const arm2Outline = {type: LINE, shape: arm2Line, color: 0x000, lineWidth: this.gridUnit * 1.8};

        obscuredShapes.push({
            type: CIRCLE,
            color: topColor,
            strokeColor: 0x000,
            shape: new Circle(shoulder1Point.x, shoulder1Point.y, this.gridUnit * 0.65),
        });
        obscuredShapes.push({
            type: CIRCLE,
            color: topColor,
            strokeColor: 0x000,
            shape: new Circle(shoulder2Point.x, shoulder2Point.y, this.gridUnit * 0.65),
        });

        const leg1 = {
            type: LINE,
            shape: this.getLine(this.shoe1, !this.surface ? point : shoulder1Point),
            color: this.color,
            lineWidth: this.gridUnit * 1.2,
        };
        const leg2 = {
            type: LINE,
            shape: this.getLine(this.shoe2, !this.surface ? point : shoulder1Point),
            color: this.color,
            lineWidth: this.gridUnit * 1.2,
        };
        if (this.gForce.none) {
            obscuredShapes.unshift(leg1);
            obscuredShapes.unshift(leg2);
        }

        obscuredShapes.push(arm1Outline);
        obscuredShapes.push(arm2Outline);
        obscuredShapes.push(arm1);
        obscuredShapes.push(arm2);

        const topBlonde = 0xd9b380;
        const bottomBlonde = 0xdc89f73;
        const lok1 = getArcShape(point, this.gridUnit, 1.8, 1.5, bodyAngle + Math.PI);
        graphics.fillStyle(faceFeatColor);
        this.drawShapes(obscuredShapes);
        if (this.gForce.none && !this.surface) {

            graphics.fillStyle(this.color, 1);
            this.gForce.none && graphics.fillCircleShape(this.head.shape);

            const bunp = equator.getPoint(relativeAngle - direction - 0.5 % 1);
            const hair = this.getTrepazoid(this.pathHelper, new Circle(bunp.x, bunp.y, this.gridUnit * 2.55), bottomBlonde, 0.96, null, 0x0866251);

            hair && unubscuredShapes.push(hair);
        }
        if (this.gForce.none && !this.surface) {
            const topHair1 = getArcShape(point, this.size, 1, 2.7, bodyAngle);
            const topHair2 = getArcShape(point, this.size, 1.6, 1, bodyAngle);
            const merge = Polygon.fromPoints(getArcCurve(topHair1).getPoints());
            const merge2 = Polygon.fromPoints(getArcCurve(topHair2).getPoints());
            const merge3 = Polygon.fromPoints(getArcCurve(lok1).getPoints());
            const concat = merge.union(merge2).union(merge3);
            const {bounds} = concat.toVertices();
            const [first] = bounds as unknown as Point[][];
            const path = this.convertToPath(first);

            path?.curves.length > 0 && unubscuredShapes.push({
                type: -3,
                shape: path,
                color: topBlonde,
                strokeColor: 0X0866251,
            });

            graphics.lineStyle(this.gridUnit / 4, 0x000);
            graphics.fillStyle(this.color, 1);
            graphics.fillStyle(0x9f1f19, 0.7);
            dp(mouthPoint);
            graphics.fillStyle(0x9f1f19, 0.2);
            dp(eyeBottomLine.getPoint(cheek1));
            dp(eyeBottomLine.getPoint(cheek2));
            graphics.fillStyle(faceFeatColor, 1);
            graphics.fillStyle(0xFFFFFF, 1);
        }

        this.drawShapes(unubscuredShapes);
        graphics.lineStyle(0, 0);
        if (this.gForce.down) {
            this.face.setVisible(true);
            this.expression.setVisible(true);

            if (this.surface) {
                this.expression.setFrame(0);
            } else {
                // tslint:disable-next-line:no-shadowed-variable
                const that = this as ContainerLite;
                that.setChildVisible(this.shadow as unknown as GameObject, false);
                that.setChildLocalPosition(this.shoe1, this.gridUnit / 2, this.gridUnit / 2);
                that.setChildLocalPosition(this.shoe2, -this.gridUnit / 2, this.gridUnit / 2);
                that.setChildRotation(this.shoe1, 0);
                that.setChildRotation(this.shoe2, 0);
            }
        }
    }

    public crateCollider = (me: Player, crate: Crate) => {
        // console.log(true);
        this.pushedCrate = crate;
        if (!crate.player) {
            crate.player = true;
        }
        this.handleCrateCollison(crate);
    }

    private walk(direction) {
        const {graphics, point} = this as unknown as PerspectiveMixinType;
        const container = this as unknown as ContainerLite;

        // re-enable moving in a certain direction if passed a blockade
        if (this.pushedCrate) {
            this.resetBlockedDirections(this.pushedCrate);
        }

        // Every frame, we create a new velocity for the sprite based on what keys the player is holding down.
        const velocity = new Phaser.Math.Vector2(0, 0);
        const {
            left: {isDown: leftDown},
            right: {isDown: rightDown},
            up: {isDown: upDown},
            down: {isDown: downDown},
        } = this.cursorKeys;
        if (leftDown && !this.blockedDirection.left) {
            velocity.x -= 1;
            this.hasInput = true;
            this.blockedDirection.right = false;
        }
        if (rightDown && !this.blockedDirection.right) {
            velocity.x += 1;
            this.hasInput = true;
            this.blockedDirection.left = false;
        }
        if (upDown && !this.blockedDirection.up) {
            velocity.y -= 1;
            this.hasInput = true;
            this.blockedDirection.down = false;
        }
        if (downDown && !this.blockedDirection.down) {
            velocity.y += 1;
            this.hasInput = true;
            this.blockedDirection.up = false;
        }
        if (this.hasInput) {
            const count = this.pace / 600;
            if (this.now >= 1) {
                this.step = -count;
            }
            if (this.now <= 0) {
                this.step = +count;
            }
            this.now += this.step;
            let pa;
            let pb;
            if (this.surface) {
                const bottom = this.center.y + this.gridUnit / 2;
                const xy = { x: 0, y: 0 };
                xy.y = bottom;
                xy.x = this.center.x + this.now;
                const that = this as ContainerLite;
                that.setChildLocalPosition(this.shoe1, this.now * 10, this.gridUnit / 4);
                that.setChildLocalPosition(this.shoe2, -this.now * 10, this.gridUnit / 4);
                that.setChildRotation(this.shoe1, Math.PI);
                that.setChildRotation(this.shoe2, Math.PI);
            } else {
                const a1 = (direction + 0.45) % 1;
                const a2 = (direction + 0.05) % 1;

                const b1 = (direction + 0.55) % 1;
                const b2 = (direction + 0.95) % 1;
                const p1 = point2Vec(this.feetCircle.getPoint(a1));
                const p2 = point2Vec(this.feetCircle.getPoint(b1));
                graphics.fillStyle(0x0FFFFF, 1);
                const pp = this.feetCircle.getPoint(a2);
                const ppb = this.feetCircle.getPoint(b2);
                pa = p1.clone().lerp(pp, this.now);
                pb = p2.clone().lerp(ppb, Math.abs(this.now - 1));
                container.setChildPosition(this.shoe1, pa.x, pa.y);
                container.setChildPosition(this.shoe2, pb.x, pb.y);
            }
        }
        // We normalize the velocity so that the player is always moving at the same speed, regardless of direction.
        const normalizedVelocity = velocity.normalize();
        const gameObject = (this as unknown as GameObjects.GameObject);
        (gameObject.body as Physics.Arcade.Body)
            .setVelocity(normalizedVelocity.x * this.speed, normalizedVelocity.y * this.speed);
    }

    private pushCrateImpl(direction: string, crate: Crate) {
        const up = direction === 'up';
        const down = direction === 'down';
        const right = direction === 'right';
        const left = direction === 'left';
        const none = false;
        const blockedDirection = {up, down, right, left, none: false};
        if (crate instanceof Wall) {
            this.blockedDirection = blockedDirection;
            return;
        }
        const collision: Types.Physics.Arcade.ArcadeBodyCollision = {up, down, right, left, none};
        const axis = up || down ? 'y' : 'x';

        const selection: Crate[] = this.crates
            .filter((item: Crate) => crate !== item && collidesOnAxes(crate, item, collision, this.max))
            .sort((a: Crate, b: Crate) => a[axis] < b[axis] ? -1 : 1);
        const collidingCrate = up || left ? selection[selection?.length - 1] : selection[0];

        if (impassable(crate, collidingCrate, this.factor, collision, this.worldBounds)) {
            this.blockedDirection = blockedDirection;
        } else {
            up || left ? crate[axis] -= this.factor : crate[axis] += this.factor;
            crate.update();
            const polys = getNavMesh(this.allCrates, (this as unknown as GameObject).scene.physics.world.bounds, this.enemy.getWidth() / 2);
            this.enemy.updateMesh(polys);
        }
    }
}
