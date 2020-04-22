import { Input, Physics, Math as PMath, Types } from 'phaser';
export default class Enemy extends Physics.Arcade.Sprite {
    private speed: number = 0;
    private measure: number;
    private blockY: number = 1;
    private blockX: number = 1;
    private chasePlayer: boolean = true;
    constructor(config, measure: number) {        
        super(config.scene, config.x, config.y, "enemy");
         
        config.scene.add.existing(this)
        config.scene.physics.add.existing(this)
        
        this.speed = measure * 200;
        this.measure = measure;
        this.setScale(this.measure / 3);
        this.setCollideWorldBounds(true);
    }        
    public exterminate(player: PMath.Vector2){     
        const enemyVelocity = new PMath.Vector2(player.x - this.x , player.y  - this.y).normalize();
        if (this.chasePlayer){
            this.setVelocity(enemyVelocity.x * (this.speed * this.blockX), enemyVelocity.y * (this.speed * this.blockY));   // this.speed = this.measure * 200;
        }
        
      }
      public isCollidingCrate(){
          return this.body.touching.down || this.body.touching.up || this.body.touching.right || this.body.touching.left  ;
      }
      public cratesOverlap = (me:Enemy, crate: Physics.Arcade.Sprite) => {  
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
            if( crate.body.touching.up ){                                 
                    this.setVelocityY(-this.speed);                                                                  
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
    
}