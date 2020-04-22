import { Input, GameObjects, Physics } from 'phaser';
import Enemy from './Enemy';
import Player from './Player';
import { getGameWidth, getGameHeight } from '../helpers';



const sceneConfig: Phaser.Types.Scenes.SettingsConfig = {
  active: false,
  visible: false,
  key: 'Game',
  physics: {
    
  }
};

export class GameScene extends Phaser.Scene {
  private measure: number = 0;  
  private keySpace: Phaser.Input.Keyboard.Key;
  private player: Player;
  private enemy: Enemy;
  private crates: Phaser.Physics.Arcade.Group
  private playerCollider: Phaser.Physics.Arcade.Collider;
  private enemyCollider: Phaser.Physics.Arcade.Collider;
  private enemyCratesCollider: Phaser.Physics.Arcade.Collider; 

  constructor() {
    super(sceneConfig);
  }
  private endGame(won: boolean = false) {
    this.add.text( getGameWidth(this) / 2.5, getGameHeight(this) / 2, won ? 'you win' :'game over').setFontSize(this.measure * 50);
    this.physics.pause();

    this.player.setTint(0xff0000);

  }

  private blastOff(){
    const gravity = this.measure * 29999;
    this.crates.setVelocityY(this.measure * 100);
      this.player.setGravityY(gravity);
      this.enemy.setGravityY(gravity);
      
      this.crates.children.iterate((crate: Phaser.Physics.Arcade.Sprite)=> crate.setGravityY(gravity / 10));
      this.player.setVelocityY(0);
      this.enemy.setVelocityY(1000);
      this.physics.world.colliders.remove(this.enemyCollider);
      // this.physics.world.colliders.remove(this.playerCollider);
      // this.physics.world.colliders.remove(this.enemyCratesCollider);
      this.physics.world.addCollider(this.crates, this.enemy);
      
      this.physics.add.overlap(this.crates, this.enemy, () => { 
        console.log(this.enemy.getBottomCenter().y, this.physics.world.bounds.bottom);
        if (this.enemy.getBottomCenter().y >= this.physics.world.bounds.bottom){
          this.enemy.setVisible(false);
          this.endGame(true);
        }
      });

  }

  public create() {
    const setBounds = (item: Phaser.Physics.Arcade.World) => item.setBounds(0, 0, getGameWidth(this), getGameHeight(this));
    
    setBounds(this.physics.world);
    this.measure = getGameWidth(this) / 1000;
    const scale = this.measure;

    this.crates = this.physics.add.group({
      key: 'crate',
      repeat: 9,
      setXY: { x: 100, y:100,  stepY: scale*100 },      
      collideWorldBounds: true,    
      setScale: { x: scale, y: scale},
      // bounceX: 1,
      // bounceY: 1,
      dragX: 2000,
      dragY: 2000,
  });
    
    this.crates.world.setBoundsCollision();
    this.crates.children.iterate((crate: Physics.Arcade.Sprite)=> crate.setX(Phaser.Math.Between(0, getGameWidth(this))));
    
    this.player = new Player({scene:this,x:getGameWidth(this) / 2, y: getGameHeight(this) / 2}, scale);
    this.enemy = new Enemy({scene:this,x:getGameWidth(this) / 2,y:100}, scale);
        
  
    this.physics.add.collider(this.crates, this.crates);
    this.playerCollider = this.physics.add.collider(this.player, this.crates);
    
    this.physics.add.overlap(this.player, this.enemy, () => this.endGame(), null, true);
    
    const cratesOverlap = (e:Physics.Arcade.Sprite, e2: Physics.Arcade.Sprite) => {  
      e.setVelocity(this.measure * 150);
      e2.setVelocity(-this.measure * 150);
      if (this.player.body.touching.up){
        this.player.upBlocked = true;
      }
      if (this.player.body.touching.down){
        this.player.downBlocked = true;
      }
      if (this.player.body.touching.left){
        this.player.leftBlocked = true;
      }
      if (this.player.body.touching.right){
        this.player.rightBlocked = true;
      }
      
    };
    this.enemyCratesCollider = this.physics.add.overlap(this.crates, this.crates, cratesOverlap);

    this.enemyCollider = this.physics.add.overlap(this.enemy, this.crates, this.enemy.cratesOverlap);
  
    this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  }

  public update() {
    // Every frame, we create a new velocity for the sprite based on what keys the player is holding down.
    
    if (this.player.isMoving() && !this.enemy.isCollidingCrate()) {
      const pos = new Phaser.Math.Vector2(this.player.x, this.player.y);
      this.enemy.exterminate(pos);
    }
    
    if (this.keySpace.isDown) {  
        this.blastOff()
    }
    this.player.update();
    if (this.player.body.touching.none){
      // this.player.upBlocked = false;
    }
    
  }
}
