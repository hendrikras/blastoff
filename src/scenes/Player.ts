import { Input, Physics, Math, Types } from 'phaser';
export default class Player extends Physics.Arcade.Sprite {
    private speed: number = 0;
    private measure: number;
    private hasInput: boolean;
    private cursorKeys: Types.Input.Keyboard.CursorKeys;
    public upBlocked: boolean = false;
    public downBlocked: boolean = false;
    public leftBlocked: boolean = false;
    public rightBlocked: boolean = false;
    constructor(config, measure: number) {        
        super(config.scene, config.x, config.y, "man");
            
        config.scene.add.existing(this);        
        config.scene.physics.add.existing(this)
        
        this.speed = measure * 500;
        this.measure = measure;
        this.setScale(this.measure * 2);
        this.setCollideWorldBounds(true);
        this.cursorKeys = config.scene.input.keyboard.createCursorKeys();
    }        
    
    public isMoving(){
        return this.hasInput;
    }
    public update() {
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