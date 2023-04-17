import {Scene, Physics, GameObjects} from 'phaser';
import {Direction, Collision4Direction} from '../helpers';
import ArcadeBodyCollision = Phaser.Types.Physics.Arcade.ArcadeBodyCollision;
import {PerspectiveMixinType} from './PerspectiveMixin';

class Wall extends Phaser.GameObjects.Rectangle {
    get direction(): ArcadeBodyCollision {
        return this.$direction;
    }
  public key;
  public color: number;
  private $direction: ArcadeBodyCollision;
    // tslint:disable-next-line:variable-name
  private _depth: number;
  constructor(scene: Scene, x: number , y: number, w: number, h: number, d, color: number, key = 'wall', direction: ArcadeBodyCollision = Collision4Direction(Direction.none)) {
       super(scene, x, y, w, h, color);
       scene.add.existing(this);
       scene.physics.add.existing(this);

       const body = ((this as unknown as GameObjects.GameObject).body as Physics.Arcade.Body);
       body.pushable = false;
       body.onWorldBounds = true;
       this.color = color;
       this.depth = 1;
       this.key = key;
       this.name = key;
       this.$direction = direction;
   }
   get drawDepth(): number {
       return this._depth;
   }
   set drawDepth(depth: number) {
       this._depth = depth;
       (this as any).graphics.setDepth(this.depth);
   }

    public update() {
      const that = this as unknown as PerspectiveMixinType;
      that.graphics.clear();

      that.graphics.fillStyle(this.color, 1);
      that.predraw();
        // the walls should draw the face that is visible. for the rest the draw order is based on position.
      if (this.direction.none) {
        that.drawInView();
      } else {
          Object.entries(this.direction).forEach((value: [string, boolean]) => value[1] && that.drawVertices(that.getFaceByDirection(Direction[value[0]])) );
      }
    }
}

export default Wall;
