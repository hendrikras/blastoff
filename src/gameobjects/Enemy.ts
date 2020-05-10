import { Math } from 'phaser';
import Crate from './Crate';
import CollidesWithObjects from './CollidesWithObjects';
function pushCrate(direction: string, crate: Crate) {
    this.setBlockedDirection(direction);
    this.xThreshold = crate.x / this.gridUnit;
    this.setVelocity(0);
}
export default class Enemy extends CollidesWithObjects {
    private readonly speed: number = 0;
    private playersCrate: Crate;
    private $chasePlayer: boolean = true;

    constructor(config, gridUnit: number) {
        super(config.scene, config.x, config.y, 'enemy');

        config.scene.add.existing(this);
        config.scene.physics.add.existing(this);

        this.speed = gridUnit * 20;
        this.gridUnit = gridUnit / 10;
        this.setScale(this.gridUnit / 8);
        this.setCollideWorldBounds(true);
        this.setFrame(1);
        this.xThreshold = this.x / gridUnit;
        this.yThreshold = this.y / gridUnit;
        this.pushCrate = pushCrate;
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
        const enemyVelocity = new Math.Vector2(player.x - this.x , player.y  - this.y).normalize();
        const xSpeed = this.blockedDirection.left || this.blockedDirection.right ? 0 : this.speed;
        const ySpeed = this.blockedDirection.up || this.blockedDirection.down ? 0 : this.speed;

        this.resetBlockedDirections();

        this.setVelocity(enemyVelocity.x * xSpeed, enemyVelocity.y * ySpeed);

      }
      public cratesOverlap = (me: Enemy, crate: Crate) => {
        this.blockedDirection.none = false;
        this.distanceToBoxCorner = crate.width;
        crate.enemy = me;
        this.handleCrateCollison(crate);
      }

      public update() {
          const {x, y} = this.body.velocity;
          this.flipX = false;
          if (y > 0) {
            this.setFrame(1);
          }
          if (y < 0) {
            this.setFrame(2);
        }
          if (x > 0 && x > y) {
            this.setFrame(0);
            this.flipX = true;
        }
          if (x < 0 && x > y) {
            this.setFrame(0);
        }

      }

}
