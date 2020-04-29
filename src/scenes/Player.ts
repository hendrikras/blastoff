import { Input, Physics, Math, Types } from 'phaser';
import { MINIMUM_DISTANCE, HALF_BOX_SIZE} from '../constants';

export default class Player extends Physics.Arcade.Sprite {
    private speed: number = 0;
    private gridUnit: number;
    private hasInput: boolean;
    private cursorKeys: Types.Input.Keyboard.CursorKeys;
    private upBlocked: boolean = false;
    private downBlocked: boolean = false;
    private leftBlocked: boolean = false;
    private rightBlocked: boolean = false;
    private xThreshold : number;
    private yThreshold : number;
    private pushedCrate: Physics.Arcade.Sprite;
    private pace: number = 30;

    constructor(config, gridUnit: number) {        
        super(config.scene, config.x, config.y, "man");
            
        config.scene.add.existing(this);        
        config.scene.physics.add.existing(this);

        this.speed = gridUnit * this.pace;
        this.gridUnit = gridUnit / 10;
        this.setScale(this.gridUnit * 2);
        this.setCollideWorldBounds(true);
        this.cursorKeys = config.scene.input.keyboard.createCursorKeys();
    }        
    
    public isMoving(){
        return this.hasInput;
    }
    public crateCollider = (me: Player, crate: Phaser.Physics.Arcade.Sprite) => {    
      if ((crate as any).enemyTouching) console.log('touching')
      if (this.pushedCrate) {
        // this.pushedCrate.body.immovable = false;
        // this.pushedCrate.setAlpha(100);
      }
      this.pushedCrate = crate;
      const relativeX = (crate.x / this.gridUnit - this.x / this.gridUnit) 
      const relativeY = (crate.y / this.gridUnit - this.y / this.gridUnit ) 
      
      const edge = HALF_BOX_SIZE;
      const factor = (this.pace / 10) * 2.5;
      if(relativeY < edge && (relativeX < edge && relativeX > -edge) ){            
         crate.y -= factor;      
      }
      else if (relativeY > edge && (relativeX < edge && relativeX > -edge)){        
        crate.y += factor;      
      }
      
      else if( relativeX > edge && (relativeY < edge && relativeY > -edge) ){        
        crate.x += factor;
      }

      else if( relativeX < edge && (relativeY < edge && relativeY > -edge) ){        
        crate.x -= factor;
      }
    }
    public cratesOverlap = (e:Physics.Arcade.Sprite, e2: Physics.Arcade.Sprite) => {  
        // // console.log(e, e2)
        if (this.body.touching.none){
          e.body.x += this.gridUnit;
          e2.body.x -= this.gridUnit;
          e.body.y += this.gridUnit;
          e2.body.y -= this.gridUnit;
        }
        
        if (this.body.touching.up && e === this.pushedCrate){        
          this.upBlocked = true;
          this.xThreshold = this.pushedCrate.x / this.gridUnit;
          e.setAlpha(1,0,0,0);

          e.body.y += MINIMUM_DISTANCE;
          this.y += MINIMUM_DISTANCE; 
          
        }  
      if (this.body.touching.down && e === this.pushedCrate){        
        e.setAlpha(0,1,0,0);
        this.downBlocked = true;
        this.xThreshold = this.pushedCrate.x / this.gridUnit;
        console.log 
          e.body.y -= MINIMUM_DISTANCE;
          this.y -= MINIMUM_DISTANCE
        
      }  
      if (this.body.touching.right && e === this.pushedCrate){        
        e.setAlpha(0,0,1,0);
        this.rightBlocked= true;
        this.yThreshold = this.pushedCrate.y / this.gridUnit;        
          e.body.x -= MINIMUM_DISTANCE;
          this.x -= MINIMUM_DISTANCE
      }  
      if (this.body.touching.left && e === this.pushedCrate){        
        e.setAlpha(0,0,0,1);
        this.leftBlocked = true;
        this.yThreshold = this.pushedCrate.y / this.gridUnit;        
        e.body.x += MINIMUM_DISTANCE;
          this.x += MINIMUM_DISTANCE
      
      }
    }
    public update() {
        
        // re-enable moving in a certain direction if passed a blockade
        if (this.xThreshold - this.x / this.gridUnit > HALF_BOX_SIZE 
          || this.xThreshold - this.x / this.gridUnit < -HALF_BOX_SIZE         
          ) {
          this.downBlocked = false;
          this.upBlocked = false;
          this.xThreshold = this.x;                
          this.pushedCrate = null;
        }
        if (this.yThreshold - this.y / this.gridUnit > HALF_BOX_SIZE 
          || this.yThreshold - this.y / this.gridUnit < -HALF_BOX_SIZE
          ) {
          this.leftBlocked = false;
          this.rightBlocked = false;
          this.yThreshold = this.x;                
          this.pushedCrate = null;
        }
        // Every frame, we create a new velocity for the sprite based on what keys the player is holding down.
        const velocity = new Phaser.Math.Vector2(0, 0);
        if (this.cursorKeys.left.isDown && !this.leftBlocked) {
          velocity.x -= 1;
          this.hasInput= true;
          this.rightBlocked = false;
        }
        if (this.cursorKeys.right.isDown && !this.rightBlocked)  {
          velocity.x += 1;
          this.hasInput = true;
          this.leftBlocked = false;
        }
        if (this.cursorKeys.up.isDown && !this.upBlocked) {
          velocity.y -= 1;
          this.hasInput = true;
          this.downBlocked = false;
        }
        if (this.cursorKeys.down.isDown && !this.downBlocked) {
          velocity.y += 1;
          this.hasInput = true;
          this.upBlocked = false;
        }          
    
        // We normalize the velocity so that the player is always moving at the same speed, regardless of direction.
        const normalizedVelocity = velocity.normalize();
          this.setVelocity(normalizedVelocity.x * this.speed, normalizedVelocity.y * this.speed);       
      }
}