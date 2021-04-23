import { Physics, Types, GameObjects } from 'phaser';
import Crate from './Crate';
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite';
import {PerspectiveMixinType} from './PerspectiveMixin';
import CIRCLE = Phaser.Geom.CIRCLE;
import ELLIPSE = Phaser.Geom.ELLIPSE;

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
  }
