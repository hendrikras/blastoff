import {Input, Physics, Math as Pmath, Types, Scene, Math as PMath, Geom} from 'phaser';
// import Player from './Player';
import Enemy from './Enemy';
import {getGameWidth, getGameHeight, lineIntersect} from '../helpers';
import Vector2 = Phaser.Math.Vector2;
import RoundTo = Phaser.Math.RoundTo;

class Wall extends Phaser.GameObjects.Rectangle {
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
  private $player: boolean = false;
  private $enemy?: Enemy = null;
  private graphics;
  private vanishPoint: Vector2;
  private MeasurePointY1: Vector2;
  private MeasurePointY2: Vector2;
  private MeasurePointX1: Vector2;
  private MeasurePointX2: Vector2;
  private screenHeight: number;
  private key;
  private centerCubeToEdge: number;
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
       this.point = new Vector2(0, 0);
       this.setStrokeStyle(3, 0x000, 1);
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
   public update() {
       const {x, y, dimensions, graphics, vanishPoint, mp, color, lineWidth, strokeColor, alpha } = this;
       graphics.clear();

       const xhalf = dimensions.x / 2;
       const yhalf = dimensions.y / 2;
       const xFactor = this.pastCenter('x') ? -xhalf : xhalf;
       const yFactor = this.pastCenter('y') ? -yhalf : yhalf;

       const top = new PMath.Vector2(x + xFactor, y - yFactor);
       const bottom = new PMath.Vector2(x + xFactor, y + yFactor);
       // this is either bottomleft of topright depending on whether crate is positioned on the top of bottom side of the screen
       const blotr = new PMath.Vector2(x - xFactor , y + yFactor);
       const brotl = new PMath.Vector2(x + xFactor, y + yFactor);

      // draw a line towards the center of the screen, but stop when it intersects with a measure point (imaginary) line
       const floorBottom = lineIntersect(vanishPoint, bottom, top, mp(this.pastCenter('y'), 'Y'));
       const floorTop = lineIntersect(vanishPoint, top, bottom, mp(!this.pastCenter('y'), 'Y'));
       const intersect3 = lineIntersect(vanishPoint, blotr, brotl, mp(!this.pastCenter('x'), 'X'));
       // const intersect4 = lineIntersect(vanishPoint, brotl, blotr, mp(this.pastCenter('x'), 'X'));
      // x face
       graphics.fillStyle(color, alpha);
       graphics.lineStyle(lineWidth, strokeColor, alpha);

       if (vanishPoint.distance(top) > vanishPoint.distance(blotr) ) {
           this.drawPoints(bottom, top, floorTop, floorBottom);
           this.drawPoints(floorBottom, intersect3, blotr, brotl);
       } else {
           this.drawPoints(brotl, blotr, intersect3, floorBottom);
           this.drawPoints(floorBottom, floorTop, top, bottom);
       }
   }
    private drawPoints(...args) {
        const { graphics } = this;
        graphics.fillPoints(args, true);
        graphics.strokePath();
    }
    private pastCenter = (axis: string) => this[axis] > this.vanishPoint[axis];
    private  mp = (cond: boolean, axis: string) => cond ? this[`MeasurePoint${axis}1`] : this[`MeasurePoint${axis}2`];

}

export default Wall;
