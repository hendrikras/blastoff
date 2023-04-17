import {GameObjects, Physics, Types} from 'phaser';
import {
    collidesOnAxes,
    getArcCurve,
    getArcShape,
    getNavMesh,
    impassable,
    point2Vec,
    setPosition,
    ShapeCollectionItem,
} from '../helpers';
import {hairPoints, facePoints, dressPoints, dressSide, hairRight} from './Points'

import Crate from './Crate';
import CollidesWithObjects, { SphereType } from './CollidesWithObjects';
import ArcadeBodyBounds = Phaser.Types.Physics.Arcade.ArcadeBodyBounds;
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite';
import Circle = Phaser.Geom.Circle;
import Ellipse = Phaser.Geom.Ellipse;
import Vector2 = Phaser.Math.Vector2;
import BetweenPoints = Phaser.Math.Angle.BetweenPoints;
import Normalize = Phaser.Math.Angle.Normalize;

import PerspectiveObject from '../gameobjects/PerspectiveMixin';
import SphereClass from './Sphere';
import CIRCLE = Phaser.Geom.CIRCLE;
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
    public color: number;
    private size: number;
    private pathHelper: Circle;
    private step: number;
    private now: number;
    private enemy: Enemy;
    private max: number;
    private frame = 0;
    private reverseAnimation = false;
    private bones: Physics.Arcade.Body;
    private isOnLadder = false;

    constructor(config, gridUnit: number, crates: Physics.Arcade.Group, size, enemy: Enemy) {
        super(config.scene, config.x, config.y, size, size);
        this.bones = (this.body as Physics.Arcade.Body);
        this.bones.setCollideWorldBounds(true);
        this.enemy = enemy;
        this.allCrates = crates;
        (this as ContainerLite).scene = config.scene;
        const container = this as unknown as ContainerLite;
        const {x, y} = config;
        this.color = 0XEFCAB7;
        const shadowColor = 0X031920;
        this.size = size;
        this.shadow = config.scene.add.circle(x, y, size / 2.5, shadowColor, 0.4);
        const quarter = size * 1.8;
        this.shoe1Counter = 0;
        this.step = +1;
        this.now = 0;
        const Sphere = PerspectiveObject(SphereClass);
        this.head = new Sphere(config.scene, x, y, quarter, quarter, quarter, this.color) as unknown as SphereType;
        this.head.setDepth(2);

        const shoeColor = 0xAD661F;
        const shoeStyle = [this.size / 5, 0x663300, 1];
        this.shoe1 = config.scene.add.rexRoundRectangle(x, y, size * 2, size, size / 2, shoeColor);
        this.shoe1.setStrokeStyle(...shoeStyle);
        this.shoe1.setScale(0.2);
        this.shoe1.setDepth(2);
        this.shoe2 = config.scene.add.rexRoundRectangle(x, y, size * 2, size, size / 2, shoeColor);
        this.shoe2.setScale(0.2);
        this.shoe2.setStrokeStyle(...shoeStyle);
        this.shoe2.setDepth(2);

        this.center = new Circle(x, y, size * 1.1);
        this.reach = new Circle(x, y, size * 1.3);
        this.pathHelper = new Circle(x, y, size);
        this.feetCircle = new Circle(x, y, size);

        container.add(this.shadow as unknown as GameObject);
        container.add(this.shoe1);
        container.add(this.shoe2);

        const faceOffset = gridUnit * 2;
        const dressOffset = gridUnit / 1.5;

        this.crates = crates?.children.getArray() as Crate[] || [];
        this.speed = gridUnit * this.pace;
        this.gridUnit = gridUnit / 10;
        this.cursorKeys = config.scene.input.keyboard.createCursorKeys();
        this.pushCrate = this.pushCrateImpl;
        this.worldBounds = config.scene.physics.world.bounds;
        const w = this.worldBounds.right - this.worldBounds.x;
        const h = this.worldBounds.bottom - this.worldBounds.y;
        this.max = h > w ? h : w;
    }
    public addCrate(crate: Crate) {
        this.crates.push(crate);
    }

    public getCrates(){
        return this.crates;
    }

    public isMoving() {
        return this.hasInput;
    }
    private getAngleForDirection(direction: string){
        switch (direction) {
            case 'up':
                return -Math.PI / 2;
            case 'down':
                return Math.PI / 2;
            case 'left':
                return Math.PI;
            default:
                return 0;
        }
    }

    public update() {
        this.hasInput = false;
        this.graphics.clear();
        // shapes can be partially obscured by other shapes
        const obscuredShapes: ShapeCollectionItem[] = [];
        const unubscuredShapes: ShapeCollectionItem[] = [];

        this.predraw();
        const {dp, graphics, point, centerBottom, centerCenter, centerUp, point7, vertices, vanishPoint} = this;
        setPosition(this.pathHelper, this);
        setPosition(this.center, this.gForce.none ? centerCenter : point);
        setPosition(this.head, point);
        setPosition(this.reach, point);
        if (this.gForce.none) {
            this.head.update();
        }
        const {equator, pi2: all} = this.head;
        const {curve: eyeTopLine} = this.head.getSlice('x', 0.8);
        const {curve: eyeCenterLine} = this.head.getSlice('x', 0.65);
        const {curve: eyeBottomLine} = this.head.getSlice('x', 0.4);
        this.setChildPosition(this.shadow as unknown as GameObject, centerBottom.x, centerBottom.y);
        (this.shadow as any).depth = 1;
        this.shoe1.depth = 2;
        this.shoe2.depth = 2;
        graphics.setDepth(2);

        const bodyAngle = this.getBodyAngle();
        const direction = Normalize(this.gForce.down? this.getAngleForDirection('up') : bodyAngle) / all;

        const relativeAngle = Normalize(BetweenPoints(vanishPoint, point)) / all;
        // if (!this.surface){
            this.setChildRotation(this.shoe1, bodyAngle);
            this.setChildRotation(this.shoe2, bodyAngle);
        // }

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
        const eye1PositionOnFloor = {x: this.x - this.width / 2.5, y: this.y - this.height * 3.4};
        const eye2PositionOnFloor = {x: this.x + this.width / 2.5, y: this.y - this.height * 3.4};
        const eye1Center = this.gForce.down ? eye1PositionOnFloor: eyeCenterLine.getPoint(eye1Angle);
        const eye2Center = this.gForce.down ? eye2PositionOnFloor : eyeCenterLine.getPoint(eye2Angle);

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

        const bottomColor = 0x436b94;
        if (this.gForce.none) {
            setPosition(this.feetCircle, centerBottom);

            unubscuredShapes.push({type: CIRCLE, strokeColor: 0x000, shape: this.head.shape, order: 2});
            unubscuredShapes.push({
                type: -1,
                color: this.color,
                strokeColor: 0x000,
                lineWidth: this.gridUnit / 10,
                shape: this.getDomeShape(nosePoint, this.gridUnit * 0.35),
                order: 3
            });
            const torso = new Circle(centerCenter.x, centerCenter.y, this.gridUnit * 2);
            const skirtLength = centerCenter.clone().lerp(centerBottom, 0.7);
            const skirt = this.getTrepazoid(this.pathHelper, new Circle(skirtLength.x, skirtLength.y, this.gridUnit * 2.55), bottomColor, 0.97, null, 0x000);
            if (skirt) {
                obscuredShapes.push(skirt as unknown as ShapeCollectionItem);
            }
            obscuredShapes.push({type: CIRCLE, color: topColor, shape: torso, strokeColor: 0x000, order: 4})

        }

        if (this.gForce.none|| this.getSideForAngle(bodyAngle) !== 'right')  {
            unubscuredShapes.push({type: -1, shape: eye1, color: 0xFFFFFF, strokeColor: 0x000, lineWidth, order: this.isWalkingOnOuterBorder() ? 14 : 0});
            unubscuredShapes.push({type: -1, shape: eye1Iris, color: irisColor, strokeColor: 0x000, lineWidth, order: this.isWalkingOnOuterBorder() ? 15 : 1});
        }
        if (this.gForce.none || this.getSideForAngle(bodyAngle) !== 'left')  {
            unubscuredShapes.push({type: -1, shape: eye2, color: 0xFFFFFF, strokeColor: 0x000, lineWidth, order: this.isWalkingOnOuterBorder() ? 14 : 0});
            unubscuredShapes.push({type: -1, shape: eye2Iris, color: irisColor, strokeColor: 0x000, lineWidth, order: this.isWalkingOnOuterBorder() ? 15 : 1});
        }

        let handPos1;
        let handPos2;
        const rightHand =  (direction + 0.25) % 1;
        const leftHand = (direction + 0.75) % 1;
        const pushing = this.pushedCrate && this.pushedCrate instanceof Crate && point2Vec(this.pushedCrate).distance(point) < this.size * 4.5;
        if (this.falling.down) {
            // if (!this.surface) {
            //     if (!this.reverseAnimation) {
            //         this.frame += 20;
            //         if (this.frame === 100) {
            //             this.reverseAnimation = true;
            //         }
            //     } else {
            //         this.frame -= 20;
            //         if (this.frame === 0) {
            //             this.reverseAnimation = false;
            //         }
            //     }
            //     handPos1 = point2Vec({x: this.x - this.bones.width / 2.5, y: this.y - this.bones.height / 1.2});
            //     handPos2 = point2Vec({x: this.x + this.bones.width / 2.5, y: this.y - this.bones.height / 1.2});
            // } else {
                if (this.getSideForAngle(bodyAngle) === 'back' || this.getSideForAngle(bodyAngle) === 'front' || pushing){
                    handPos1 = point2Vec({x: this.x - this.bones.width / 2.5, y: this.y - this.bones.height / 1.2});
                    handPos2 = point2Vec({x: this.x + this.bones.width / 2.5, y: this.y - this.bones.height / 1.2});
                } else {
                    // this.pushedCrate = null;
                    handPos1 = point2Vec({x: this.x, y: this.y - this.bones.height / 2.5});
                    handPos2 = point2Vec({x: this.x, y: this.y - this.bones.height / 2.5});
                }

            // }
        } else {
            handPos1 = new Vector2(Circle.GetPoint(this.center, rightHand));
            handPos2 = new Vector2(Circle.GetPoint(this.center, leftHand));
            if (pushing) {
                const {centerCenter: center} = this.head;
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
        const handShapes = this.gForce.none ? obscuredShapes : unubscuredShapes;
        if (this.gForce.none || this.getSideForAngle(bodyAngle) !== 'right') {
            handShapes.push({
                type: CIRCLE,
                color: this.color,
                shape: new Circle(handPos1.x, handPos1.y, this.gridUnit * 0.8),
                strokeColor: 0x000,
                order: 15
            });
         }
         if (this.gForce.none || this.getSideForAngle(bodyAngle) !== 'left') {
            handShapes.push({
                type: CIRCLE,
                color: this.color,
                shape: new Circle(handPos2.x, handPos2.y, this.gridUnit * 0.8),
                strokeColor: 0x000,
                order: 15
            });
        }

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


        obscuredShapes.push({
            type: CIRCLE,
            color: topColor,
            strokeColor: 0x000,
            shape: new Circle(shoulder1Point.x, shoulder1Point.y, this.gridUnit * 0.65),
            order: 6
        });
        obscuredShapes.push({
            type: CIRCLE,
            color: topColor,
            strokeColor: 0x000,
            shape: new Circle(shoulder2Point.x, shoulder2Point.y, this.gridUnit * 0.65),
            order:6
        });

        let shoe1LinePoint1, shoe1LinePoint2, shoe2LinePoint1, shoe2LinePoint2
        if (!this.gForce.none){
            const newLeg1Point = {x: this.shoe1.x - this.bones.width / 2, y: this.y - this.bones.height};
            const newLeg2Point = {x: this.shoe2.x + this.bones.width / 2, y: this.y - this.bones.height};
            shoe1LinePoint1 = point2Vec(this.shoe1).lerp(point2Vec(newLeg1Point), 0.2);
            shoe1LinePoint2 = point2Vec(newLeg1Point).lerp(point2Vec(this.shoe1), 0.5);
            shoe2LinePoint1 = point2Vec(this.shoe2).lerp(point2Vec(newLeg2Point), 0.2);
            shoe2LinePoint2 = point2Vec(newLeg2Point).lerp(point2Vec(this.shoe2), 0.5)
        } else {
            shoe1LinePoint1 = this.shoe1;
            shoe1LinePoint2 = shoulder1Point
            shoe2LinePoint1 = this.shoe2;
            shoe2LinePoint2 = shoulder2Point;
        }

        const leg1 = {
            type: LINE,
            shape: this.getLine(shoe1LinePoint1, !this.surface ? point : shoe1LinePoint2),
            color: this.color,
            lineWidth: this.gridUnit * 1.2,
            order:0
        };
        const leg2 = {
            type: LINE,
            shape: this.getLine(shoe2LinePoint1, !this.surface ? point : shoe2LinePoint2),
            color: this.color,
            lineWidth: this.gridUnit * 1.2,
            order:0
        };
        if (this.gForce.none) {
            obscuredShapes.unshift(leg1);
            obscuredShapes.unshift(leg2);
        } else {
            unubscuredShapes.push(leg1);
            unubscuredShapes.push(leg2);
        }

        const armPosition = this.gForce.down ? {x: this.x , y: this.y - this.bones.height / 1.25} : shoulder1Point;
        const armPosition2 = this.gForce.down ? {x: this.x , y: this.y - this.bones.height / 1.25} : shoulder2Point;

        const arm1Line = this.getLine(armPosition, handPos1);
        const arm2Line = this.getLine(armPosition2, handPos2);
        const outer = this.isWalkingOnOuterBorder();
        const side = this.getSideForAngle(bodyAngle);
        function getArmOrder (outer: boolean, base: number, lowBase: number, isOutLine = false){
            if (outer) {
                if (side === 'back' || side === 'front'){
                    return isOutLine ? base - 2 : base;
                }
                return isOutLine ? base : base + 1;
            } else {
                return isOutLine ? lowBase : lowBase + 1;
            }
        }
        const arm1 = {type: LINE, shape: arm1Line, color: topColor, lineWidth: this.gridUnit * 1.2, order: getArmOrder(outer, 14, 8) };
        const arm1Outline = {type: LINE, shape: arm1Line, color: 0x000, lineWidth: this.gridUnit * 1.8, order: getArmOrder(outer, 14, 8,true) };
        const arm2 = {type: LINE, shape: arm2Line, color: topColor, lineWidth: this.gridUnit * 1.2, order: getArmOrder(outer, 14, 8)};
        const arm2Outline = {type: LINE, shape: arm2Line, color: 0x000, lineWidth: this.gridUnit * 1.8, order: getArmOrder(outer, 14, 8,true) };

        const shapes = this.isWalkingOnOuterBorder() ? unubscuredShapes : obscuredShapes;
        if (this.gForce.none || this.getSideForAngle(bodyAngle) !== 'right' ){
            shapes.push(arm1Outline);
            shapes.push(arm1);
        }
        if (this.gForce.none ||  this.getSideForAngle(bodyAngle) !== 'left'){
            shapes.push(arm2Outline);
            shapes.push(arm2);
        }

        const topBlonde = 0xd9b380;
        const bottomBlonde = 0xdc89f73;
        const hairStroke = 0X0866251;
        const lok1 = getArcShape(point, this.gridUnit, 1.8, 1.5, bodyAngle + Math.PI);
        graphics.fillStyle(faceFeatColor);
        if (this.gForce.none && !this.surface) {
            this.drawShapes(obscuredShapes);

            graphics.fillStyle(this.color, 1);
            graphics.fillCircleShape(this.head.shape);

            const bunp = equator.getPoint(relativeAngle - direction - 0.5 % 1);
            const hair = this.getTrepazoid(this.pathHelper, new Circle(bunp.x, bunp.y, this.gridUnit * 2.55), bottomBlonde, 0.96, null, 0x0866251);

            hair && unubscuredShapes.push({...hair, ...{order: 7.5}});

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
                strokeColor: hairStroke,
                order: 10
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

        graphics.lineStyle(0, 0);
        if (this.isWalkingOnOuterBorder()) {
           const side = this.getSideForAngle(bodyAngle);
           const hairWidth = this.calculateWidth(hairRight);
           const hairShape = side === 'left' || side === 'right' ? side === 'right' ? hairRight : hairRight.map(([x,y]) => [-x + hairWidth, y]) : hairPoints;
           const translated = hairShape.map( ([x,y]) => this.translate(x,y, 40, 40))
           const hairPath = this.convertToPath(translated);
           const hair= {type: -3, color: topBlonde, shape: hairPath, strokeColor: hairStroke, order: side === 'back' ? 11 : 16};
           const dressShape = dressSide;
           const translatedDress = dressShape.map( ([x,y]) => this.translate(x,y, 55, 82));

           const dressPath = this.convertToPath(translatedDress);
           const dress= {type: -3, color: topColor, shape: dressPath, strokeColor: 0x000, order: 12};

           const translatedFace = facePoints.map( ([x,y]) => this.translate(x,y, 40, 40));
           const facePath = this.convertToPath(translatedFace);
           const face= {type: -3, color: this.color, shape: facePath, strokeColor: 0x000, order: 13};

            unubscuredShapes.push(hair);
            unubscuredShapes.push(dress);
            unubscuredShapes.push(face);

            if (!this.surface) {
                this.setChildVisible(this.shadow as unknown as GameObject, false);
                this.setChildLocalPosition(this.shoe1, this.gridUnit / 2, this.gridUnit / 2);
                this.setChildLocalPosition(this.shoe2, -this.gridUnit / 2, this.gridUnit / 2);
                this.setChildRotation(this.shoe1, 0);
                this.setChildRotation(this.shoe2, 0);
            }
        }
        const sorted = unubscuredShapes.sort((a, b) => a.order - b.order);
        // console.log(unubscuredShapes)
        this.drawShapes(sorted);

    }

    public crateCollider = (me: Player, crate: Crate) => {
        this.pushedCrate = crate;
        if (!crate.player) {
            crate.player = true;
        }
        this.handleCrateCollison(crate);
    }
    public ladderCollider(me: GameObject, ladder: GameObject){
       (me as Player).setOnLadder(true);
    };
    public getOnLadder(){
        return this.isOnLadder;
    }
    public setOnLadder(value: boolean){
        this.isOnLadder = value;
    }

    private walk(direction) {
        this.setOnLadder(false);
        const {graphics, point} = this;
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
            if (!this.gForce.none) {
                this.setChildVisible(this.shadow as unknown as GameObject, false);
                this.setChildLocalPosition(this.shoe1, this.now * this.gridUnit, this.gridUnit / 5);
                this.setChildLocalPosition(this.shoe2, -this.now * this.gridUnit, this.gridUnit / 5);
                this.setChildRotation(this.shoe1, Math.PI);
                this.setChildRotation(this.shoe2, Math.PI);
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
                this.gForce.down && console.log(pa, pb);
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
    private getOffset(offset: number): number {
        return this.gridUnit * offset / 10;
    }
    // a function that returns a translated coordinate from this player
    private translate(X: number, Y: number, offX = 0, offY = 0): Point {

        const x = X * this.gridUnit;
        const y = Y * this.gridUnit;
        const newX =  x + this.x  + this.getOffset(offX) - this.bones.width;
        const newY =  y + this.y + this.getOffset(offY) - this.bones.height * 2;
        return {x: newX, y: newY};
    }

    private rotate(x, y, xm, ym, a) {
        let cos = Math.cos,
            sin = Math.sin,

            // Subtract midpoints, so that midpoint is translated to origin
            // and add it in the end again
            xr = (x - xm) * cos(a) - (y - ym) * sin(a)   + xm,
            yr = (x - xm) * sin(a) + (y - ym) * cos(a)   + ym;

        return { x: xr, y: yr};
    }

    private isWalkingOnOuterBorder(){
        const {up, down, left, right} = this.gForce;
        return down || up || left || right;
    }

    // a function that creates a shape of 4 points from a Line of 2 points plus a thickness
    private createRotatedRect(start: Point, end: Point, thickness: number): Point[] {
        // create a Line between the two points
        const line = this.getLine(start, end);
        const points: Point[] = [];
        // create a circle on the position of start with the radius of thickness
        const circle = new Circle(start.x, start.y, thickness);
        // create a circle from end
        const circle2 = new Circle(end.x, end.y, thickness);

        // get the angle of the line
        const angle = Math.atan2(line.y1 - line.y2, line.x1 - line.x2);

        points.push(circle.getPoint(angle - 0.25))
        points.push(circle.getPoint(angle + 0.25))
        points.push(circle2.getPoint(angle + 0.25))
        points.push(circle2.getPoint(angle - 0.25))

        return points;

    }

    private getSideForAngle(bodyAngle: number){
        const { PI } = Math;
        if (bodyAngle === PI / 2){
            return 'back'
        }
        if (bodyAngle === -PI / 2){
            return 'front'
        }
        if (bodyAngle === 0){
            return 'right'
        }
        return 'left';
    }
    calculateWidth(points: number[][]): number {
        if (points.length === 0) {
          return 0;
        }

        const { minX, maxX } = points.reduce(
          (acc, [x]) => ({
            minX: Math.min(acc.minX, x),
            maxX: Math.max(acc.maxX, x),
          }),
          { minX: points[0][0], maxX: points[0][0] }
        );

        return maxX - minX;
      }
}
