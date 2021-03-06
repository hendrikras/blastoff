import {Scene} from 'phaser';
import {getGameWidth, getGameHeight} from '../helpers';
import Vector2 = Phaser.Math.Vector2;
class Wall extends Phaser.GameObjects.Rectangle {
  private graphics;
  private vanishPoint: Vector2;
  private MeasurePointY1: Vector2;
  private MeasurePointY2: Vector2;
  private MeasurePointX1: Vector2;
  private MeasurePointX2: Vector2;
  private screenHeight: number;
  private key;
  private color: number;
  private dimensions: Vector2;
  private point: Vector2;
  constructor(scene: Scene, x: number , y: number, w: number, h: number, d, color: number) {
       super(scene, x, y, w, h, color);
       scene.add.existing(this);
       // scene.physics.add.existing(this);
       this.color = color;
       this.depth = 1;
       this.key = 'wall';
       this.name = this.key;
       this.point = new Vector2(0, 0);
       this.graphics = scene.add.graphics();
       const height = getGameHeight(scene);
       const width = getGameWidth(scene);
       this.screenHeight = height;
       this.vanishPoint = new Vector2(width / 2, height / 2);
       this.dimensions = new Vector2(w, h);

       // I always turn to this when I get confused about the math behind one point perspective
       // and I always get confused when I deal with this
       // https://www.math.utah.edu/~treiberg/Perspect/Perspect.htm
       const {physics: {world: {bounds}}} = this.scene;
       const val = (bounds.left - bounds.right);

       const wrt = (this.dimensions.x / d);
       const hrt = (this.dimensions.y / d);
       const aspectH =  h < w ? val * hrt :  val * hrt;
       const aspectW =  h < w ? val * wrt : val * wrt;
       this.MeasurePointY1 = new Vector2(this.vanishPoint.x, this.vanishPoint.y + aspectH);
       this.MeasurePointY2 = new Vector2(this.vanishPoint.x, this.vanishPoint.y - aspectH );
       this.MeasurePointX1 = new Vector2(this.vanishPoint.x + aspectW, this.vanishPoint.y);
       this.MeasurePointX2 = new Vector2(this.vanishPoint.x - aspectW, this.vanishPoint.y);
   }
}

export default Wall;
