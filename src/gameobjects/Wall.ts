import {Scene} from 'phaser';
class Wall extends Phaser.GameObjects.Rectangle {
  private key;
  private color: number;
  constructor(scene: Scene, x: number , y: number, w: number, h: number, d, color: number) {
       super(scene, x, y, w, h, color);
       scene.add.existing(this);
       // scene.physics.add.existing(this);
       this.color = color;
       this.depth = 1;
       this.key = 'wall';
       this.name = this.key;

      // @ts-ignore
       this.update = this.draw;
   }
}

export default Wall;
