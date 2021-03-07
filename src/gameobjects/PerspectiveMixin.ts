import {Scene, Math as PMath} from 'phaser';
import {Constructor, getGameHeight, getGameWidth, lineIntersect} from '../helpers';
import Vector2 = Phaser.Math.Vector2;
import Wall from './Wall';

export default <TBase extends Constructor>(Base: TBase) =>
class extends Base {

  private graphics;
  private vanishPoint: Vector2;
  private color: number;
  private gridUnit: number;
  private MeasurePointY1: PMath.Vector2;
  private MeasurePointY2: PMath.Vector2;
  private MeasurePointX1: PMath.Vector2;
  private MeasurePointX2: PMath.Vector2;
  private dimensions: PMath.Vector2;
  private point: PMath.Vector2;
  private key;

    constructor(...args: any[]) {
        super(...args);
        const scene = args[0].x ? args[0].scene : args[0]; // ?
        const x = args[1];
        const y = args[2];
        this.graphics = scene.add.graphics();
        this.point = new PMath.Vector2(x, y);

        const {physics: {world: {bounds: {left, right, top, bottom, height, width, centerX, centerY}}}} = scene;
        const val = (left - right);
        this.vanishPoint = new PMath.Vector2(centerX, centerY);
        if (typeof args[3] === 'number') { // toDo: make this distinction based on type
            const w = args[3];
            const h = args[4];
            const d = args[5];
            this.dimensions = new Vector2(w, h);

            const wrt = (this.dimensions.x / d);
            const hrt = (this.dimensions.y / d);
            const aspectH = h < w ? val * hrt : val * hrt;
            const aspectW = h < w ? val * wrt : val * wrt;
            this.setMeasurePoints(aspectW, aspectH);
        } else {
            this.key = args[3];
            // this mystery value will take us to the edge of the cube
            this.gridUnit = scene.data.get('gridUnit');
            const xy = (this.gridUnit * 2.6) * 4;
            this.dimensions = new Vector2(xy, xy);
            this.setMeasurePoints(val, val);
        }
    }

   public draw() {
       // @ts-ignore
       const {x, y, dimensions, graphics, vanishPoint, mp } = this;
       graphics.clear();
       this.point.x = x;
       this.point.y = y;
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
      // x face
       graphics.fillStyle(this.color, 1);

       if ((this as unknown as Wall).name === 'wall' && vanishPoint.distance(top) > vanishPoint.distance(blotr) ) {
           this.calcDrawDir(top, bottom, floorTop, floorBottom, 'y');
           this.calcDrawDir(blotr, brotl, intersect3, floorBottom, 'x');
       } else {
           this.calcDrawDir(blotr, brotl, intersect3, floorBottom, 'x');
           this.calcDrawDir(top, bottom, floorTop, floorBottom, 'y');
       }
   }
    private setMeasurePoints(offsetX, offsetY) {
        // measurepoints are placed on the horizon line of the vanishpoint,
        // they are spaced equally apart with the vanishpoint in the exact center
        // when you draw a line from the measurepoint towards the center of the cube it will intersect 2 opposing corners of a face on that cube
        // when both measurepoints of the same axis are drawn,
        // an X will then be drawn on that face, starting from the corners and intersecting in the center
        //
        // because the game world is not a perfect square. we need to compensate for the aspect ratio.

        this.MeasurePointY1 = new Vector2(this.vanishPoint.x, this.vanishPoint.y + offsetY);
        this.MeasurePointY2 = new Vector2(this.vanishPoint.x, this.vanishPoint.y - offsetY );
        this.MeasurePointX1 = new Vector2(this.vanishPoint.x + offsetX, this.vanishPoint.y);
        this.MeasurePointX2 = new Vector2(this.vanishPoint.x - offsetX, this.vanishPoint.y);
    }
   private calcDrawDir(top, bottom, floorTop, floorBottom, axis) {
       this.pastCenter(axis)
           ? this.drawPoints(bottom, top, floorBottom, floorTop)
           : this.drawPoints(top, bottom, floorTop, floorBottom);
   }
    private drawPoints(top, bottom, floorTop, floorBottom) {

        const { graphics } = this;
        // @ts-ignore
        graphics.lineStyle(this.lineWidth, 0x000, this.alpha);

        graphics.fillPoints([top, bottom, floorBottom, floorTop], true);
        graphics.strokePath();
    }
    private pastCenter = (axis: string) => this[axis] > this.vanishPoint[axis];
    private  mp = (cond: boolean, axis: string) => cond ? this[`MeasurePoint${axis}1`] : this[`MeasurePoint${axis}2`];
};
