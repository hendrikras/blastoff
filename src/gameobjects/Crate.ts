import { Input, Physics, Math, Types, Scene } from 'phaser';
// import Player from './Player';
import Enemy from './Enemy';
import { getGameWidth, getGameHeight, lineIntersect} from '../helpers';

class Crate extends Physics.Arcade.Sprite {
  private $player: boolean = false;
  private $enemy?: Enemy = null;
  private graphics;
  private vanishPoint: Math.Vector2;
  private MeasurePointY1: Math.Vector2;
  private MeasurePointY2: Math.Vector2;
  private gridUnit: number;
  get enemy(): Enemy {
    return this.$enemy;
  }
  set enemy(value: Enemy) {
    this.$enemy = value;
  }
  get player(): boolean {
    return this.$player;
  }
  set player(value: boolean) {
    this.$player = value;

  }
   constructor(scene: Scene, x: number , y: number) {
       super(scene, x, y, 'crates');
       scene.add.existing(this);
       scene.physics.add.existing(this);
       this.setFrame(Math.Between(0, 4));
       this.graphics = scene.add.graphics();
       const height = getGameHeight(scene);
       const width = getGameWidth(scene);
       this.vanishPoint = new Math.Vector2(width / 2, height / 2);
       this.MeasurePointY1 = new Math.Vector2(this.vanishPoint.x, 0);
       this.MeasurePointY2 = new Math.Vector2(this.vanishPoint.x, height);
       this.gridUnit = scene.data.get('gridUnit');
   }
   public update() {
      this.graphics.clear();
      this.graphics.setTexture('crates');

      const { x, y } = this;
      const num = this.gridUnit * 2.6;

      const pastCenter: boolean = x  > this.vanishPoint.x;
      const factor = pastCenter ? -num : num;

      const top = new Math.Vector2(x + factor * 2, y - factor * 2);
      const bottom = new Math.Vector2(x + factor * 2, y + factor * 2);
      const mp = (cond: boolean) => cond ? this.MeasurePointY1 : this.MeasurePointY2;
      const intersect1 = lineIntersect(this.vanishPoint, bottom, top, mp(pastCenter));
      const intersect2 = lineIntersect(this.vanishPoint, top, bottom, mp(!pastCenter));

      this.graphics.moveTo(top.x, top.y);
      this.graphics.lineTo(bottom.x, bottom.y);
      this.graphics.lineTo(intersect1.x, intersect1.y);
      this.graphics.lineTo(intersect2.x, intersect2.y);
      this.graphics.closePath();
      this.graphics.fillPath();
   }
}

export default Crate;
