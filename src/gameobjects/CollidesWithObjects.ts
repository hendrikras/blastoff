import { Physics, Types } from 'phaser';
import Crate from './Crate';
export default class CollidesWithObjects extends Physics.Arcade.Sprite {
    protected distanceToBoxCorner: number;
    protected pushedCrate: Crate;
    protected gridUnit: number;
    protected xThreshold: number;
    protected yThreshold: number;
    protected blockedDirection: Types.Physics.Arcade.ArcadeBodyCollision = { up: false, down: false, right: false, left: false, none: true };
    public pushCrate = (dir: string, crate: Crate) => console.error('not implemented!');
    protected hasReachedCrateCorner = (axis: string) => (this[`${axis}Threshold`] - this[axis] / this.gridUnit > this.distanceToBoxCorner || this[`${axis}Threshold`] - this[axis] / this.gridUnit < - this.distanceToBoxCorner);
    protected setCollidedObject(crate: Crate) {
      if (!this.distanceToBoxCorner) {
        this.distanceToBoxCorner = this.width + crate.width / 2;
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
        const relativeX = (crate.x / this.gridUnit - this.x / this.gridUnit);
        const relativeY = (crate.y / this.gridUnit - this.y / this.gridUnit );
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
  }
