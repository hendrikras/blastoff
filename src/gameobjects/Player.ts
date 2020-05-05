import { Input, Physics, Math, Types } from 'phaser';
import { collidesOnAxes, impassable } from '../helpers';
import { MINIMUM_DISTANCE, HALF_BOX_SIZE} from '../constants';
import Crate from './Crate';
import Enemy from './Enemy';

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
    private pushedCrate: Crate;
    private pace: number = 30;
    private crates: Crate[];
    private factor: number = (this.pace / 10) * 2.5;

    constructor(config, gridUnit: number, crates: Physics.Arcade.Group) {        
        super(config.scene, config.x, config.y, "man");
            
        config.scene.add.existing(this);        
        config.scene.physics.add.existing(this);
        this.crates = crates.children.getArray() as Crate[];
        this.speed = gridUnit * this.pace;
        this.gridUnit = gridUnit / 10;
        this.setScale(this.gridUnit * 2);
        this.setCollideWorldBounds(true);
        this.cursorKeys = config.scene.input.keyboard.createCursorKeys();
    }        
    
    public isMoving(){
        return this.hasInput;
    }
    private pushCrate(direction: string, crate:Crate){
      const up = direction === 'up';
      const down = direction === 'down';
      const right = direction === 'right';
      const left = direction === 'left';
      const none = false;

      const collision: Types.Physics.Arcade.ArcadeBodyCollision= { up, down, right, left, none };
      console.log(collision)
      const selection = this.crates.filter((item:Crate) => collidesOnAxes(crate, item, collision));
      const collidingCrate = up || left ? selection.pop() : selection[0]; 
      console.log(111, selection);    
      if (impassable(crate, collidingCrate, this.factor, collision)){
      
        this.upBlocked = up;
        this.downBlocked = down;
        this.leftBlocked = left;
        this.rightBlocked = right;
        const opAxis = right || left ? 'y' : 'x';
        this[`${opAxis}Threshold`] = crate[opAxis] / this.gridUnit;                  
      } else {
        const axis = up || down ? 'y' : 'x';
        up || left ? crate[axis] -= this.factor : crate[axis] += this.factor;
      }
    }
    public crateCollider = (me: Player, crate: Crate) => {
          
      this.pushedCrate = crate;
      if (!crate.player){
        crate.player = true;
      }
      const relativeX = (crate.x / this.gridUnit - this.x / this.gridUnit) 
      const relativeY = (crate.y / this.gridUnit - this.y / this.gridUnit ) 
      
      const edge = crate.body.height / 2;
      

      console.log(relativeY, edge);
      if(relativeY < edge && (relativeX < edge && relativeX > -edge) ){                    
        this.pushCrate('up', crate);         
      }
      else if (relativeY > edge && (relativeX < edge && relativeX > -edge)){        
        this.pushCrate('down', crate);  
      }
      
      else if( relativeX > edge && (relativeY < edge && relativeY > -edge) ){        
        this.pushCrate('right', crate);  
      }

      else if( relativeX < edge && (relativeY < edge && relativeY > -edge) ){        
        this.pushCrate('left', crate);
      }
    }
    
    public resetPlayerOnCrate(){
      if (this.pushedCrate && this.pushedCrate.player){
        this.pushedCrate.player = false;                
      } 
      this.pushedCrate = null;
    }
    public update() {
        
        // re-enable moving in a certain direction if passed a blockade
        if (this.xThreshold - this.x / this.gridUnit > HALF_BOX_SIZE 
          || this.xThreshold - this.x / this.gridUnit < -HALF_BOX_SIZE         
          ) {
          this.downBlocked = false;
          this.upBlocked = false;
          this.xThreshold = this.x;
          this.resetPlayerOnCrate();
        }
        if (this.yThreshold - this.y / this.gridUnit > HALF_BOX_SIZE 
          || this.yThreshold - this.y / this.gridUnit < -HALF_BOX_SIZE
          ) {
          this.leftBlocked = false;
          this.rightBlocked = false;
          this.yThreshold = this.y;
          this.resetPlayerOnCrate();
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