import { Input, Physics, Math, Types } from 'phaser';
import { collidesOnAxes, impassable } from '../helpers';

import Crate from './Crate';
import CollidesWithObjects from './CollidesWithObjects';

export default class Player extends CollidesWithObjects {
    private speed: number = 0;
    private hasInput: boolean;
    private cursorKeys: Types.Input.Keyboard.CursorKeys;
    private pushedCrate: Crate;
    private pace: number = 30;
    private crates: Crate[];
    private factor: number = (this.pace / 10) * 2.5;
  
    constructor(config, gridUnit: number, crates: Physics.Arcade.Group) {        
        super(config.scene, config.x, config.y, "man");
            
        config.scene.add.existing(this);        
        config.scene.physics.add.existing(this);
        config.scene.physics.add.overlap(this, crates, this.crateCollider, null, true);
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
      this.setCollidedObject(crate);
      const up = direction === 'up';
      const down = direction === 'down';
      const right = direction === 'right';
      const left = direction === 'left';
      const none = false;      
      const collision: Types.Physics.Arcade.ArcadeBodyCollision= { up, down, right, left, none };
      const selection = this.crates.filter((item:Crate) => collidesOnAxes(crate, item, collision));
      const collidingCrate = up || left ? selection.pop() : selection[0]; 
      
      if (crate.enemy || impassable(crate, collidingCrate, this.factor, collision)){      
        this._blockedDirection = { up, down, right, left, none: false};
        const opAxis = right || left ? 'y' : 'x';
        this[`${opAxis}Threshold`] = crate[opAxis] / this.gridUnit;                  
      } else {
        const axis = up || down ? 'y' : 'x';
        up || left ? crate[axis] -= this.factor : crate[axis] += this.factor;
      }
    }
    private crateCollider = (me: Player, crate: Crate) => {
          
      this.pushedCrate = crate;
      if (!crate.player){
        crate.player = true;
      }
      const relativeX = (crate.x / this.gridUnit - this.x / this.gridUnit) 
      const relativeY = (crate.y / this.gridUnit - this.y / this.gridUnit )       
      const edge = crate.body.height / 2;      

      if(relativeY < edge && (relativeX < edge && relativeX > -edge) ){                    
        this.pushCrate('up', crate);         
        
        if (crate.enemy){
          crate.enemy.setBlockedDirection('down');
        }
      }
      else if (relativeY > edge && (relativeX < edge && relativeX > -edge)){        
        this.pushCrate('down', crate);  
        
        if (crate.enemy){
          crate.enemy.setBlockedDirection('up');
        }
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
        // if (this.pushedCrate.enemy)  this.pushedCrate.enemy.chasePlayer = true;
        this.pushedCrate.enemy = null;                
      } 
      this.pushedCrate = null;
    }    
    public update() {
      // re-enable moving in a certain direction if passed a blockade
        ['x', 'y'].forEach((axis: string) =>{
          if (this.hasReachedCrateCorner(axis)) {
            axis === 'x' ? this._blockedDirection.down = false : this._blockedDirection.right = false;
            axis === 'x' ? this._blockedDirection.up = false : this._blockedDirection.left= false;
            this[`${axis}Threshold`] = this[axis];
            this.resetPlayerOnCrate();
          }
        });        
        
        // Every frame, we create a new velocity for the sprite based on what keys the player is holding down.
        const velocity = new Phaser.Math.Vector2(0, 0);
        if (this.cursorKeys.left.isDown && !this._blockedDirection.left) {
          velocity.x -= 1;
          this.hasInput= true;
          this._blockedDirection.right = false;
        }
        if (this.cursorKeys.right.isDown && !this._blockedDirection.right)  {
          velocity.x += 1;
          this.hasInput = true
          this._blockedDirection.left = false;
        }
        if (this.cursorKeys.up.isDown && !this._blockedDirection.up) {
          velocity.y -= 1;
          this.hasInput = true;
          this._blockedDirection.down = false;
        }
        if (this.cursorKeys.down.isDown && !this._blockedDirection.down) {
          velocity.y += 1;
          this.hasInput = true;
          this._blockedDirection.up = false;
        }          
    
        // We normalize the velocity so that the player is always moving at the same speed, regardless of direction.
        const normalizedVelocity = velocity.normalize();
          this.setVelocity(normalizedVelocity.x * this.speed, normalizedVelocity.y * this.speed);       
      }
}