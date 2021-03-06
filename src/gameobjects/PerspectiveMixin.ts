import {Scene, Math as PMath} from 'phaser';
import {Constructor, lineIntersect} from '../helpers';
import Vector2 = Phaser.Math.Vector2;

export default <TBase extends Constructor>(Base: TBase) =>
class extends Base {

  private graphics;
  private vanishPoint: Vector2;
  private point: Vector2;
  private color: number;
   public update() {
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
       // const intersect4 = lineIntersect(vanishPoint, brotl, blotr, mp(this.pastCenter('x'), 'X'));
      // x face
       graphics.fillStyle(this.color, 1);

       if (vanishPoint.distance(top) > vanishPoint.distance(blotr) ) {
           this.calcDrawDir(top, bottom, floorTop, floorBottom, 'y');
           this.calcDrawDir(blotr, brotl, intersect3, floorBottom, 'x');
       } else {
           this.calcDrawDir(blotr, brotl, intersect3, floorBottom, 'x');
           this.calcDrawDir(top, bottom, floorTop, floorBottom, 'y');
       }
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
