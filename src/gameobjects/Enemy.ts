import { Input, Physics, Math as PMath, Types } from 'phaser';
import { MINIMUM_DISTANCE, HALF_BOX_SIZE} from '../constants';
import Crate from './Crate';
export default class Enemy extends Physics.Arcade.Sprite {
    private speed: number = 0;
    private gridUnit: number;
    private playersCrate: Crate;
    private chasePlayer: boolean = true;
    constructor(config, gridUnit: number) {        
        super(config.scene, config.x, config.y, "enemy");
         
        config.scene.add.existing(this)
        config.scene.physics.add.existing(this)
        
        this.speed = gridUnit * 20;
        this.gridUnit = gridUnit / 10;
        this.setScale(this.gridUnit / 8);
        this.setCollideWorldBounds(true);
        this.setFrame(1);
        // this.toggleFlipY();
    }        
    public exterminate(player: PMath.Vector2){     
        const enemyVelocity = new PMath.Vector2(player.x - this.x , player.y  - this.y).normalize();
        if (this.chasePlayer){
            // this.setVelocity(enemyVelocity.x * (this.speed * this.blockX), enemyVelocity.y * (this.speed * this.blockY));   // this.speed = this.gridUnit * 200;
        }
        
      }
      public isCollidingCrate(){
          return this.body.touching.down || this.body.touching.up || this.body.touching.right || this.body.touching.left  ;
      }
      public cratesOverlap = (me:Enemy, crate: Crate) => {       
        
          this.setVelocity(0);

        if (me === this){            
            crate.enemy = me;
            this.playersCrate = crate;
            if( crate.body.touching.up ){                                                 
                    // this.y -= MINIMUM_DISTANCE;
                    // (crate as any).enemyTouching = false;

            }            
            if( crate.body.touching.down ){                                 
                this.setVelocityY(this.speed);                                                                  
             }

             if( crate.body.touching.left ){                                 
                this.setVelocityX(-this.speed);                                                                  
             }
             if( crate.body.touching.right ){                                 
                this.setVelocityX(-this.speed);                                                                  
             }
        }        
                  
      };

      public update(){
        if (this.playersCrate && (this.x -this.playersCrate.body.x > HALF_BOX_SIZE * this.gridUnit  || this.y - this.playersCrate.body.y > HALF_BOX_SIZE * this.gridUnit)  ){
          console.log(this.x -this.playersCrate.body.x, this.y -this.playersCrate.body.y);
          this.playersCrate.enemy = null;
        }
          const {x, y} = this.body.velocity;
          this.flipX = false;
          if (y > 0){
            this.setFrame(1);
          }
          if (y < 0){
            this.setFrame(2);
        }
        if (x > 0 && x > y){
            this.setFrame(0);
            this.flipX = true;
        }
        if (x < 0 && x > y){
            this.setFrame(0);
            // this.flipX = true;
        }
        
                    
      }
    
}