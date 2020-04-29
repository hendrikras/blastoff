import { Input, Physics, Math as PMath, Types } from 'phaser';
export default class Enemy extends Physics.Arcade.Sprite {
    private speed: number = 0;
    private gridUnit: number;
    private blockY: number = 1;
    private blockX: number = 1;
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
      public cratesOverlap = (me:Enemy, crate: Physics.Arcade.Sprite) => {       
        // console.log('én', me, this);     
        // if (me === this) {
            // me.setVelocity(0);
            // this.speed = 0;
            // crate.setVelocity(crate.body.touching.up || crate.body.touching.left ? 500 : -500);
        // }  
        
          this.setVelocity(0);
        //   this.speed = 0;
        this.chasePlayer = !this.chasePlayer;
        if (me === this){            
            // const {touching} = crate.body;
            (crate as any).enemyTouching = true;
            if( crate.body.touching.up ){                                                 
                    this.setVelocityY(-this.speed);
                    (crate as any).enemyTouching = false;

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