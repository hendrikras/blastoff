import { Physics, Types } from 'phaser';
import Crate from './Crate';
export default class CollidesWithObjects extends Physics.Arcade.Sprite {
    protected distanceToBoxCorner: number;
    protected gridUnit: number;
    protected xThreshold : number;
    protected yThreshold : number;
    protected _blockedDirection: Types.Physics.Arcade.ArcadeBodyCollision = { up: false, down:false, right:false, left:false, none:true }
    protected hasReachedCrateCorner = (axis: string) => (this[`${axis}Threshold`] - this[axis] / this.gridUnit > this.distanceToBoxCorner || this[`${axis}Threshold`] - this[axis] / this.gridUnit < - this.distanceToBoxCorner);
    protected setCollidedObject(crate: Crate) {
      if (!this.distanceToBoxCorner){
        this.distanceToBoxCorner = this.width + crate.width / 2;
      }
    }
  }
