import { Math, Physics, GameObjects } from 'phaser';
import Crate from './Crate';
import CollidesWithObjects from './CollidesWithObjects';

export default class Enemy extends CollidesWithObjects {
    private readonly speed: number = 0;
    private playersCrate: Crate;
    private $chasePlayer: boolean = true;

    constructor(config, gridUnit: number, size: number, scale: number) {
        super(config.scene, config.x, config.y, size, scale);

        const sprite = config.scene.add.sprite(0, 0, 'enemy');
        this.add(sprite);
        this.speed = gridUnit * 20;
        this.gridUnit = gridUnit / 10;
        sprite.setFrame(1);
        this.pushCrate = this.pushCrateImpl;
    }
    public get chasePlayer() {
      return this.$chasePlayer;
    }
    public set chasePlayer(value: boolean) {
      this.$chasePlayer = value;
    }
    public setBlockedDirection(direction: string) {
      this.blockedDirection[direction] = true;
    }
    public exterminate(player: Math.Vector2) {
        const that = (this as unknown as GameObjects.Container);
        const enemyVelocity = new Math.Vector2(player.x - that.x , player.y  - that.y).normalize();
        const xSpeed = this.blockedDirection.left || this.blockedDirection.right ? 0 : this.speed;
        const ySpeed = this.blockedDirection.up || this.blockedDirection.down ? 0 : this.speed;

        this.resetBlockedDirections();

        (that.body as Physics.Arcade.Body).setVelocity(enemyVelocity.x * xSpeed, enemyVelocity.y * ySpeed);

      }
      public cratesOverlap = (me: Enemy, crate: Crate) => {
        if (this.pushedCrate && this.playersCrate !== crate) {
            this.pushedCrate.enemy = null;
        }
        this.pushedCrate = crate;
        this.blockedDirection.none = false;
        this.distanceToBoxCorner = crate.width;
        crate.enemy = me;
        this.handleCrateCollison(crate);
      }

      public update() {
          const that = (this as unknown as GameObjects.Container);
          if (this.pushedCrate) {
            if (this.pushedCrate.x - that.x > this.pushedCrate.height || this.pushedCrate.y - that.y > this.pushedCrate.height) {
                this.pushedCrate.enemy = null;
            }
        }
      }

    private pushCrateImpl(direction: string, crate: Crate) {
        const that = (this as unknown as GameObjects.Container);
        this.setBlockedDirection(direction);
        const opAxis = direction === 'right' || direction ===  'left' ? 'y' : 'x';
        this[`${opAxis}Threshold`] = crate[opAxis] / this.gridUnit;
        (that.body as Physics.Arcade.Body).setVelocity(0);
    }

}
