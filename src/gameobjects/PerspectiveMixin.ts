import {Math as PMath} from 'phaser';
import {Constructor, Direction, lineIntersect} from '../helpers';
import Vector2 = Phaser.Math.Vector2;
import Wall from './Wall';
import Graphics = Phaser.GameObjects.Graphics;
interface Ref { idx1: number; idx2: number; mp: Vector2; }

export default <TBase extends Constructor>(Base: TBase) =>
class extends Base {

    get centerDown(): Phaser.Math.Vector2 {
        return this.centerPointsFace(1, 3, 8);
    }
    get centerBottom(): Phaser.Math.Vector2 {
        return this.centerPointsFace(3, 4, 9);
    }
    get centerUp(): Phaser.Math.Vector2 {
        return this.centerPointsFace(4, 6, 8);
    }
    get point7(): Phaser.Math.Vector2 {
        return this.calcVertexPos(7);
    }

    get centerCenter(): Phaser.Math.Vector2 {
        if (!this.vertices[8.5]) {
            this.vertices[8.5] = this.centerBottom.clone().lerp(this.point, 0.5);
        }
        return this.vertices[8.5];
    }
  public color: number;
  public key;

  private graphics;
  private vanishPoint: Vector2;
  private gridUnit: number;
  private MeasurePointY1: PMath.Vector2;
  private MeasurePointY2: PMath.Vector2;
  private MeasurePointX1: PMath.Vector2;
  private MeasurePointX2: PMath.Vector2;
  private vertices: Vector2[];
  private dimensions: PMath.Vector2;
  private point: PMath.Vector2;
  private intersectMap: Ref[];

    constructor(...args: any[]) {
        super(...args);
        const scene = args[0].x ? args[0].scene : args[0]; // ?
        const x = args[1];
        const y = args[2];
        this.graphics = scene.add.graphics();
        this.point = new PMath.Vector2(x, y);
        this.vertices = [];

        const {physics: {world: {bounds: {left, right,  centerX, centerY}}}} = scene;
        const val = (left - right);
        this.vanishPoint = new PMath.Vector2(centerX, centerY);
        this.gridUnit = scene.data.get('gridUnit');
        this.intersectMap = [];
        if (this instanceof Wall) {
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
            const xy = (this.gridUnit * 2.6) * 4;
            this.dimensions = new Vector2(xy, xy);
            this.setMeasurePoints(val, val);
        }
    }
   public predraw() {

       // @ts-ignore
       const {x, y, dimensions, vanishPoint, mp } = this;
       this.point.x = x;
       this.point.y = y;
       const xhalf = dimensions.x / 2;
       const yhalf = dimensions.y / 2;

       // each corner (vertice) of the cube has been given a number. A picture really does speak a 1000 words:
       // https://en.wikipedia.org/wiki/Polygon_mesh#/media/File:Vertex-Vertex_Meshes_(VV).png
       this.vertices[1] = new PMath.Vector2(x - xhalf, y + yhalf);
       this.vertices[2] = new PMath.Vector2(x + xhalf, y + yhalf);
       this.vertices[5] = new PMath.Vector2(x - xhalf, y - yhalf);
       this.vertices[6] = new PMath.Vector2(x + xhalf, y - yhalf);
       // were going to calculate these if needed. but we need to get rid of any old values from the previous position
       delete this.vertices[0];
       delete this.vertices[3];
       delete this.vertices[4];
       delete this.vertices[7];
       delete this.vertices[8];
       delete this.vertices[8.5]; // center
       delete this.vertices[9];
   }
    public drawInView() {
        this.drawVertices(this.getYFaceInView());
        this.drawVertices(this.getXFaceInView());
    }

    public dp = (p: Vector2) => (this as unknown as PerspectiveMixinType).graphics.fillPoint(p.x, p.y, this.gridUnit / 2);
    private centerPointsFace(a, b, newN, lerp = 0.5): Phaser.Math.Vector2 {

        if (!this.vertices[newN]) {
            this.vertices[newN] = this.calcVertexPos(a).lerp(this.calcVertexPos(b), lerp);
        }
        return this.vertices[newN];
    }

    private calcVertexPos(num) {
        const {vertices: v, vanishPoint, intersectMap} = this;
        if (!v[num]) {
            const imap = intersectMap?. [num];
            const result = lineIntersect(vanishPoint, v[imap.idx1], v[imap.idx2], imap.mp);
            if (result) {
                v[num] = result;
            }
        }
        return v[num];
    }

    private drawVertices(points) {
        this.drawPoints(points[0], points[1], points[2], points[3]);
    }
   private getFaceByDirection(direction: Direction) {
       const { vertices: v} = this;
       switch (direction) {
           case Direction.up:
               this.calcVertexPos(4);
               this.calcVertexPos(7);
               return [v[5], v[6], v[4], v[7]];
           case Direction.down:
               this.calcVertexPos(0);
               this.calcVertexPos(3);
               return [v[1], v[2], v[0], v[3]];
           case Direction.left:
               this.calcVertexPos(0);
               this.calcVertexPos(4);
               return [v[1], v[5], v[0], v[4]];
           default:
               this.calcVertexPos(3);
               this.calcVertexPos(7);
               return [v[2], v[6], v[3], v[7]];
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
        const createStruct = (idx1, idx2, mp) => ({idx1, idx2, mp});
        this.intersectMap[0] = createStruct(1, 5, this.MeasurePointY2);
        this.intersectMap[3] = createStruct(2, 1, this.MeasurePointX2);
        this.intersectMap[4] = createStruct(5, 1, this.MeasurePointY1);
        this.intersectMap[7] = createStruct(6, 2, this.MeasurePointY1);

    }
    private getXFaceInView = (): Vector2[] => this.pastCenter('x')
        ? this.getFaceByDirection(Direction.left)
        : this.getFaceByDirection(Direction.right)

    private getYFaceInView = (): Vector2[] => this.pastCenter('y')
        ? this.getFaceByDirection(Direction.up)
        : this.getFaceByDirection(Direction.down)
    private drawPoints(top, bottom, floorTop, floorBottom) {

        const { graphics } = this;
        // @ts-ignore
        graphics.lineStyle(this.lineWidth, 0x000, this.alpha);

        graphics.fillPoints([top, bottom, floorBottom, floorTop], true);
        graphics.strokePath();
    }
    private pastCenter = (axis: string) => this[axis] > this.vanishPoint[axis];
};

export interface PerspectiveMixinType  {
    vertices: Vector2[];
    vanishPoint: PMath.Vector2;
    dimensions: PMath.Vector2;
    point: PMath.Vector2;
    centerBottom: PMath.Vector2;
    centerCenter: PMath.Vector2;
    centerUp: PMath.Vector2;
    centerDown: PMath.Vector2;
    point7: PMath.Vector2;
    graphics: Graphics;
    draw: () => void;
    pastCenter: (a: string) => boolean;
    mp: () => void;
    x: number;
    y: number;
    color: number;
    gridUnit: number;
    predraw: () => void;
    drawVertices: (faceByDirection: Phaser.Math.Vector2[]) => void;
    getFaceByDirection: (direction: Direction) => Vector2[];
    drawInView: () => void;
    dp: (p: Vector2) => void;
}
