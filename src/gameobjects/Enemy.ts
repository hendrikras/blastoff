import { Input, Physics, Math as PMath, Types } from 'phaser';
import { MINIMUM_DISTANCE, HALF_BOX_SIZE} from '../constants';
import Crate from './Crate';
import CollidesWithObjects from './CollidesWithObjects';

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
        this.xThreshold = this.x;
        // this.toggleFlipY();
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
    public exterminate(player: PMath.Vector2) {
        const enemyVelocity = new PMath.Vector2(player.x - this.x , player.y  - this.y).normalize();
        // if (this.chasePlayer){

        if (this.hasReachedCrateCorner('x')) {
              this.blockedDirection.up = false;
              this.blockedDirection.down = false;
              this.xThreshold = this.x;
            }

        const xSpeed = this.blockedDirection.left || this.blockedDirection.right ? -1 : this.speed;
        const ySpeed = this.blockedDirection.up || this.blockedDirection.down ? -1 : this.speed;

        // this.setVelocity(enemyVelocity.x * xSpeed, enemyVelocity.y * ySpeed);
        // }

      }
      public cratesOverlap = (me: Enemy, crate: Crate) => {
        this.blockedDirection.none = false;

        if (me === this) {
            crate.enemy = me;
            this.playersCrate = crate;
            if (!crate.player) {
              this.chasePlayer = !this.chasePlayer;
              if ( crate.body.touching.up ) {
                this.blockedDirection.down = true;
                this.xThreshold = crate.x / this.gridUnit;
            } else if ( crate.body.touching.down ) {
                this.blockedDirection.up = true;
                this.xThreshold = crate.x / this.gridUnit;
             } else if ( crate.body.touching.left ) {
              this.blockedDirection.left = true;
              this.yThreshold = crate.y / this.gridUnit;
             } else if ( crate.body.touching.left ) {
                this.blockedDirection.right = true;

             }
            } else {
              this.chasePlayer = false;
              // this.setVelocity(0);
            }

        }

      }

      public update() {
        // if (this.playersCrate && (this.x -this.playersCrate.body.x > HALF_BOX_SIZE * this.gridUnit  || this.y - this.playersCrate.body.y > HALF_BOX_SIZE * this.gridUnit)  ){
        //   console.log(this.x -this.playersCrate.body.x, this.y -this.playersCrate.body.y);
        //   this.playersCrate.enemy = null;
        // }
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
            // this.flipX = true;
        }

      }

}
