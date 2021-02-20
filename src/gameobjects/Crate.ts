import { Input, Physics, Math, Types, Scene } from 'phaser';
// import Player from './Player';
import Enemy from './Enemy';
import { getGameWidth, getGameHeight, lineIntersect, addProperty} from '../helpers';

class Crate extends Physics.Arcade.Sprite {
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
  private gridUnit: number;
    private  function;    constructor(scene: Scene, x: number , y: number) {
       super(scene, x, y, 'crates');
       scene.add.existing(this);
       scene.physics.add.existing(this);
       this.setFrame(Math.Between(0, 4));
       this.graphics = scene.add.graphics();
       this.graphics.depth = 1;
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
       // because our game world is not a perfect square. we need to compensate for the aspect ratio.
       const {physics: {world: {bounds}}} = this.scene;
       const val = (bounds.left - bounds.right);

       this.MeasurePointY1 = new Math.Vector2(this.vanishPoint.x, this.vanishPoint.y + val);
       this.MeasurePointY2 = new Math.Vector2(this.vanishPoint.x, this.vanishPoint.y - val);
       this.MeasurePointX1 = new Math.Vector2(this.vanishPoint.x + val, this.vanishPoint.y);
       this.MeasurePointX2 = new Math.Vector2(this.vanishPoint.x - val, this.vanishPoint.y);
       this.gridUnit = scene.data.get('gridUnit');
   }
   public update() {
      // there is a lot of calculus going on here in order to achieve the 3d 'effect'.
       // the reason why not to use hardware accelarated methods is because using quads and meshes are such a pain in phaser
       // and since all that is required is a 'one point perspective' 3d on very simple geomitry (cube).
       // So screw it, should still be simple enough for even phaser to handle.
      this.graphics.clear();

      // this.graphics.setTexture('crates')
      this.graphics.fillStyle(0x996633, 1);

      this.graphics.lineStyle(3, 0x663300, 1.0);

      const { x, y } = this;
       // this mystery value will take us to the edge of the cube, not a clue why this.width / 2 doesnt do the same.
      const centercubeToEdge = this.gridUnit * 2.6;

      // mirror everything once past the vanishing point (center)
      const xFactor = this.pastCenter('x') ? -centercubeToEdge : centercubeToEdge;
      const yFactor = this.pastCenter('y') ? -centercubeToEdge : centercubeToEdge;

      // this is either topleft of topright depending on whether crate is positioned on the left of right side of the screen
      const top = new Math.Vector2(x + xFactor * 2, y - xFactor * 2);
      const bottom = new Math.Vector2(x + xFactor * 2, y + xFactor * 2);
      // this is either bottomleft of topright depending on whether crate is positioned on the top of bottom side of the screen
      const blotr = new Math.Vector2(x - yFactor * 2 , y + yFactor * 2);
      const brotl = new Math.Vector2(x + yFactor * 2, y + yFactor * 2);

      // draw a line towards the center of the screen, but stop when it intersects with a measure point (imaginary) line
      const mp = (cond: boolean, axis: string) => cond ? this[`MeasurePoint${axis}1`] : this[`MeasurePoint${axis}2`];
      const floorBottom = lineIntersect(this.vanishPoint, bottom, top, mp(this.pastCenter('x'), 'Y'));
      const floorTop = lineIntersect(this.vanishPoint, top, bottom, mp(!this.pastCenter('x'), 'Y'));

      const intersect3 = lineIntersect(this.vanishPoint, blotr, brotl, mp(!this.pastCenter('y'), 'X'));
      const intersect4 = lineIntersect(this.vanishPoint, brotl, blotr, mp(this.pastCenter('y'), 'X'));
      // x face
      this.graphics.moveTo(top.x, top.y);
      this.graphics.lineTo(bottom.x, bottom.y);
      this.graphics.lineTo(floorBottom.x, floorBottom.y);
      this.graphics.lineTo(floorTop.x, floorTop.y);
      this.graphics.closePath();
      this.graphics.fillPath();
      this.graphics.strokePath();

      // there is one floor value, that corners. and therefore will be the same for both axis
      // const {pos: floorGlue,  factor} = this.topsOrBottoms(floorTop, floorBottom, xFactor, yFactor);

      // the other one will then have same y value. but its x value needs to be moved by the width of the cube.

      // const floorOpposite =
      // y face
      this.graphics.moveTo(blotr.x, blotr.y);
      this.graphics.lineTo(brotl.x, brotl.y);
      this.graphics.lineTo(intersect4.x, intersect4.y); // floor left (when past VP) bottom half
      this.graphics.lineTo(intersect3.x, intersect3.y); // floor right
      this.graphics.closePath();
      this.graphics.fillPath();
      this.graphics.strokePath();

   }
    private pastCenter = (axis: string) => this[axis] > this.vanishPoint[axis];
}

export default Crate;
