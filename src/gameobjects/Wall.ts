import { Input, Physics, Math, Types, Scene } from 'phaser';
// import Player from './Player';
import Enemy from './Enemy';
import { getGameWidth, getGameHeight, lineIntersect, addProperty} from '../helpers';

class Crate extends Phaser.GameObjects.Rectangle {
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
  private vanishPoint: Math.Vector2;
  private MeasurePointY1: Math.Vector2;
  private MeasurePointY2: Math.Vector2;
  private MeasurePointX1: Math.Vector2;
  private MeasurePointX2: Math.Vector2;
  private screenHeight: number;
  private key;
  private centerCubeToEdge: number;
  constructor(scene: Scene, x: number , y: number, w: number, h: number, color: number) {
       super(scene, x, y, w, h, color)
       scene.add.existing(this);
       // scene.physics.add.existing(this);
       this.key = 'tile';
       this.graphics = scene.add.graphics();
       this.graphics.depth = 0;
       const height = getGameHeight(scene);
       const width = getGameWidth(scene);
       this.screenHeight = height;
       this.vanishPoint = new Math.Vector2(width / 2, height / 2);

       // measurepoints are placed on the horizon line of the vanishpoint,
       // they are spaced equally apart with the vanishpoint in the exact center
       // when you draw a line from the measurepoint towards the center of the cube it will intersect 2 opposing corners of a face on that cube
       // when both measurepoints of the same axis are drawn,
       // an X will then be drawn on that face, starting from the corners and intersecting in the center
       //
       // because the game world is not a perfect square. we need to compensate for the aspect ratio.
       const {physics: {world: {bounds}}} = this.scene;
       const val = (bounds.left - bounds.right);

       this.MeasurePointY1 = new Math.Vector2(this.vanishPoint.x, this.vanishPoint.y + val);
       this.MeasurePointY2 = new Math.Vector2(this.vanishPoint.x, this.vanishPoint.y - val);
       this.MeasurePointX1 = new Math.Vector2(this.vanishPoint.x + val, this.vanishPoint.y);
       this.MeasurePointX2 = new Math.Vector2(this.vanishPoint.x - val, this.vanishPoint.y);
       // this mystery value will take us to the edge of the cube
       this.centerCubeToEdge = scene.data.get('gridUnit'); // * 2.6;
       // this.centerCubeToEdge = this.body.width / 5;
   }
   public update() {
       const { x, y, centerCubeToEdge, graphics, vanishPoint, key } = this;

       // there is a lot of calculus going on here in order to achieve the 3d 'effect'.
       // the reason why not to use hardware accelarated libs (Three.js), like a sane person would do is because all that is required is a 'one point perspective' 3d on very simple geomitry (cube).
       // So that should still be simple enough for phaser to handle.
       // graphics.clear();
       this.depth = 1;

       // graphics.setTexture(key);
      // this.graphics.lineStyle(3, 0x000FFFF, 1.0);
      // this.graphics.fillStyle(0x000, 0.3);


      // mirror everything once past the vanishing point (center)
       const xFactor = this.pastCenter('x') ? -centerCubeToEdge : centerCubeToEdge;
       const yFactor = this.pastCenter('y') ? -centerCubeToEdge : centerCubeToEdge;

      // this is either topleft of topright depending on whether crate is positioned on the left of right side of the screen
       const top = new Math.Vector2(x + xFactor * 2, y - xFactor * 2);
       const bottom = new Math.Vector2(x + xFactor * 2, y + xFactor * 2);
      // this is either bottomleft of topright depending on whether crate is positioned on the top of bottom side of the screen
       const blotr = new Math.Vector2(x - yFactor * 2 , y + yFactor * 2);
       const brotl = new Math.Vector2(x + yFactor * 2, y + yFactor * 2);

      // draw a line towards the center of the screen, but stop when it intersects with a measure point (imaginary) line
       const mp = (cond: boolean, axis: string) => cond ? this[`MeasurePoint${axis}1`] : this[`MeasurePoint${axis}2`];
       const floorBottom = lineIntersect(vanishPoint, bottom, top, mp(this.pastCenter('x'), 'Y'));
       const floorTop = lineIntersect(vanishPoint, top, bottom, mp(!this.pastCenter('x'), 'Y'));

       const intersect3 = lineIntersect(vanishPoint, blotr, brotl, mp(!this.pastCenter('y'), 'X'));
       const intersect4 = lineIntersect(vanishPoint, brotl, blotr, mp(this.pastCenter('y'), 'X'));
      // x face
       graphics.moveTo(top.x, top.y);
       graphics.lineTo(bottom.x, bottom.y);
       graphics.lineTo(floorBottom.x, floorBottom.y);
       graphics.lineTo(floorTop.x, floorTop.y);
       graphics.closePath();
       graphics.fillPath();
       graphics.clear();
      // this.graphics.strokePath();

      // there is one floor value, that corners. and therefore will be the same for both axis
      // const {pos: floorGlue,  factor} = this.topsOrBottoms(floorTop, floorBottom, xFactor, yFactor);
      //  graphics.moveTo(blotr.x, blotr.y);
      //  graphics.lineTo(brotl.x, brotl.y);
      //  graphics.lineTo(intersect4.x, intersect4.y); // floor left (when past VP) bottom half
      //  graphics.lineTo(intersect3.x, intersect3.y); // floor right
      //  graphics.closePath();
      //  graphics.fillPath();
      // this.graphics.strokePath();

   }
    private pastCenter = (axis: string) => this[axis] > this.vanishPoint[axis];
}

export default Crate;
