import { Input, Physics, Math as PMath, Types, Scene, Geom } from 'phaser';
import { getGameWidth, getGameHeight} from '../helpers';
import Vector2 = Phaser.Math.Vector2;
import Enemy from './Enemy';

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
  private vanishPoint: PMath.Vector2;
  private MeasurePointY1: PMath.Vector2;
  private MeasurePointY2: PMath.Vector2;
  private MeasurePointX1: PMath.Vector2;
  private MeasurePointX2: PMath.Vector2;
  private dimensions: PMath.Vector2;
  private point: PMath.Vector2;
  private screenHeight: number;
  private key;
  private gridUnit: number;
    constructor(scene: Scene, x: number , y: number, name) {
       super(scene, x, y, name);

       scene.add.existing(this);
       scene.physics.add.existing(this);
       this.key = name;
       this.setFrame(PMath.Between(0, 4));
       this.setCollideWorldBounds();
       // @ts-ignore
       this.body.onWorldBounds = true;
       this.graphics = scene.add.graphics();
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
       const xy = (this.gridUnit * 2.6) * 4;
       this.dimensions = new Vector2(xy, xy);
        // @ts-ignore
       this.drawPoints = this.drawFace;
    }
    private drawFace(top, bottom, floorTop, floorBottom) {
        // this will draw a simple crate 'texture'
        // as phaser seems to have lost the ability to draw a texture on the graphics game object in 3.5x.
        const { graphics } = this;
        const magicZ = (1000 - this.vanishPoint.distance( this.point))  / 1000 + 1;
        graphics.setDepth(magicZ);
        graphics.fillStyle(0x996633, 1);

        graphics.lineStyle(3, 0x663300, 2);
        const divide = 1 / 5;
        const topboard = top.clone().lerp(floorTop, divide).clone();
        const bottomboard = bottom.clone().lerp(floorBottom, divide).clone();
        const topfloorboard = floorTop.clone().lerp(top, divide).clone();
        const bottomfloorboard = floorBottom.clone().lerp(bottom, divide).clone();
        graphics.fillPoints([top, bottom, bottomboard, topboard], true);
        graphics.strokePath();

        graphics.fillPoints([topboard,  bottomboard, bottomfloorboard, topfloorboard], true);
        graphics.strokePath();

        graphics.fillPoints([topfloorboard, bottomfloorboard, floorBottom, floorTop], true);
        graphics.strokePath();

        // draw 7 semi transparant vertical wooden beams on the center of the crate
        let prevTop = topboard;
        let prevCorner = topfloorboard;
        const beams = 7;
        for (let i = 1; i <= beams; i++) {
            const lerp = i / beams;
            const topsideboard = topboard.clone().lerp(bottomboard, lerp).clone();
            const bottomsideboard = topfloorboard.clone().lerp(bottomfloorboard, lerp).clone();

            let alpha = 0;
            if (i !== 1) {
                alpha = i / 10;
            }
            graphics.fillStyle(0x663300, alpha);
            graphics.fillPoints([prevTop, prevCorner, bottomsideboard, topsideboard], true);
            graphics.strokePath();

            graphics.fillStyle(0x996633, 1);
            prevTop = topsideboard;
            prevCorner = bottomsideboard;
        }
    }
}

export default Crate;
