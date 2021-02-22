import { Input, Physics, Math as PMath, Types, Scene } from 'phaser';
// import Player from './Player';
import Enemy from './Enemy';
import { getGameWidth, getGameHeight, lineIntersect, calcDistance} from '../helpers';
import Vector2 = Phaser.Math.Vector2;

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
  private graphics2;
  private vanishPoint: PMath.Vector2;
  private MeasurePointY1: PMath.Vector2;
  private MeasurePointY2: PMath.Vector2;
  private MeasurePointX1: PMath.Vector2;
  private MeasurePointX2: PMath.Vector2;
  private point: PMath.Vector2;
  private screenHeight: number;
  private key;
  private gridUnit: number;
  private centerCubeToEdge: number;
    private  function;    constructor(scene: Scene, x: number , y: number, name) {
       super(scene, x, y, name);
        // console.log(texture);
       scene.add.existing(this);
       scene.physics.add.existing(this);
       this.key = name;
       this.setFrame(PMath.Between(0, 4));
       this.graphics = scene.add.graphics();
       this.graphics2 = scene.add.graphics();
       const height = getGameHeight(scene);
       const width = getGameWidth(scene);
       this.screenHeight = height;
       this.vanishPoint = new PMath.Vector2(width / 2, height / 2);
       this.point = new PMath.Vector2(x, y);

       // measurepoints are placed on the horizon line of the vanishpoint,
       // they are spaced equally apart with the vanishpoint in the exact center
       // when you draw a line from the measurepoint towards the center of the cube it will intersect 2 opposing corners of a face on that cube
       // when both measurepoints of the same axis are drawn,
       // an X will then be drawn on that face, starting from the corners and intersecting in the center
       //
       // because the game world is not a perfect square. we need to compensate for the aspect ratio.
       const {physics: {world: {bounds}}} = this.scene;
       const val = (bounds.left - bounds.right);

       this.MeasurePointY1 = new PMath.Vector2(this.vanishPoint.x, this.vanishPoint.y + val);
       this.MeasurePointY2 = new PMath.Vector2(this.vanishPoint.x, this.vanishPoint.y - val);
       this.MeasurePointX1 = new PMath.Vector2(this.vanishPoint.x + val, this.vanishPoint.y);
       this.MeasurePointX2 = new PMath.Vector2(this.vanishPoint.x - val, this.vanishPoint.y);
       // this mystery value will take us to the edge of the cube
       this.gridUnit = scene.data.get('gridUnit');
       this.centerCubeToEdge = this.gridUnit  * 2.6;
       // this.centerCubeToEdge = this.body.width / 5;
   }
   public update() {
       const { x, y, centerCubeToEdge, graphics, mp, vanishPoint, gridUnit } = this;
       this.point.x = x;
       this.point.y = y;
       // there is a lot of calculus going on here in order to achieve the 3d 'effect'.
       // the reason why not to use hardware accelarated libs (Three.js), like a sane person would do is because all that is required is a 'one point perspective' 3d on very simple geomitry (cube).
       // and working with meshes in phaser is still to buggy at this point in time
       // So this should still be simple enough for phaser to handle.
       graphics.clear();

      // mirror everything once past the vanishing point (center)
       const xFactor = this.pastCenter('x') ? -centerCubeToEdge : centerCubeToEdge;
       const yFactor = this.pastCenter('y') ? -centerCubeToEdge : centerCubeToEdge;

      // this is either topleft of topright depending on whether crate is positioned on the left of right side of the screen
       const top = new PMath.Vector2(x + xFactor * 2, y - xFactor * 2);
       const bottom = new PMath.Vector2(x + xFactor * 2, y + xFactor * 2);
      // this is either bottomleft of topright depending on whether crate is positioned on the top of bottom side of the screen
       const blotr = new PMath.Vector2(x - yFactor * 2 , y + yFactor * 2);
       const brotl = new PMath.Vector2(x + yFactor * 2, y + yFactor * 2);

      // draw a line towards the center of the screen, but stop when it intersects with a measure point (imaginary) line
       const floorBottom = lineIntersect(vanishPoint, bottom, top, mp(this.pastCenter('x'), 'Y'));
       const floorTop = lineIntersect(vanishPoint, top, bottom, mp(!this.pastCenter('x'), 'Y'));

       const intersect3 = lineIntersect(vanishPoint, blotr, brotl, mp(!this.pastCenter('y'), 'X'));
       const intersect4 = lineIntersect(vanishPoint, brotl, blotr, mp(this.pastCenter('y'), 'X'));

       // setting the depth of the 3d effect is based on a 'magic' value that is based on distance to the center
       // closer to center is higher but never bigger than 2
       const magicZ = (1000 - calcDistance(this.vanishPoint, this.point) ) / 1000 + 1;

       graphics.setDepth(magicZ);

       // x face
       this.drawFace(top, bottom, floorTop, floorBottom);
       // y face
       this.drawFace(blotr, brotl, intersect3, intersect4);
       // const size = 500;
       // const start = 0;
       // const t = new Vector2(start, start);
       // const b = new Vector2(size, start);
       // const ft = new Vector2(start, size);
       // const fb = new Vector2(size, size);
       // this.drawFace(t, b, ft, fb);

   }
   private mp = (cond: boolean, axis: string) => cond ? this[`MeasurePoint${axis}1`] : this[`MeasurePoint${axis}2`];
    private pastCenter = (axis: string) => this[axis] > this.vanishPoint[axis];
    private drawFace(top, bottom, floorTop, floorBottom) {
        // this will draw a simple crate 'texture'
        // as phaser seems to have lost the ability to draw a texture on the graphics game object in 3.5x.
        const { graphics } = this;

        graphics.fillStyle(0x996633, 1);

        graphics.lineStyle(3, 0x663300, 2);
        const divide = 1 / 5;
        const divide2 = 4 / 5;
        const topboard = top.clone().lerp(floorTop, divide).clone();
        const bottomboard = bottom.clone().lerp(floorBottom, divide).clone();
        const topfloorboard = top.clone().lerp(floorTop, divide2).clone();
        const bottomfloorboard = bottom.clone().lerp(floorBottom, divide2).clone();
        this.drawRect(top, bottom, topboard, bottomboard);
        this.drawRect(topboard,  bottomboard, topfloorboard, bottomfloorboard);
        this.drawRect(topfloorboard, bottomfloorboard, floorTop, floorBottom);

        // draw 7 semi transparant vertical wooden beams on the center of the crate
        let prevTop = topboard;
        let prevCorner = topfloorboard;
        const beams = 7;
        for (let i = 1; i <= beams; i++) {
            const lerp = i / beams;
            const topsideboard = topboard.clone().lerp(bottomboard, lerp).clone();
            const bottomsideboard = topfloorboard.clone().lerp(bottomfloorboard,  lerp).clone();

            let alpha = 0;
            if (i !== 1) {
                alpha = i / 10;
            }
            graphics.fillStyle(0x663300, alpha);
            this.drawRect(prevTop, prevCorner, topsideboard, bottomsideboard);

            graphics.fillStyle(0x996633, 1);
            prevTop = topsideboard;
            prevCorner = bottomsideboard;
        }
        this.closePath();

    }
    private drawRect(top, side, bottom, bottomSide) {
        const { graphics } = this;
        graphics.beginPath();
        graphics.moveTo(top.x, top.y);

        graphics.lineTo(side.x, side.y);
        graphics.lineTo(bottomSide.x, bottomSide.y);

        graphics.lineTo(bottom.x, bottom.y);
        this.closePath();
    }
    private closePath() {
        const {graphics} = this;
        graphics.fillPath();
        graphics.closePath();
        graphics.strokePath();
    }
    private getlineOnHalfOf(top, bottom, floorTop, floorBottom) {
        const middle = lineIntersect(top, floorBottom, bottom, floorTop);
        const halftop = new Vector2(middle.x, top.y);
        const halfbottom = new Vector2(middle.x, bottom.y);
        const a = lineIntersect(middle, halftop, top, floorTop);
        const b = lineIntersect(middle, halfbottom, bottom, floorBottom);
        return {a, b};
    }
}

export default Crate;
