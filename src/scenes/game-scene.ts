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
  private gridUnit: number = 0;  
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
    this.add.text( getGameWidth(this) / 2.5, getGameHeight(this) / 2, won ? 'you win' :'game over').setFontSize(this.gridUnit * 50);
    this.physics.pause();

    this.player.setTint(0xff0000);

  }

  private blastOff(){
    const gravity = this.gridUnit * 29999;
    this.crates.setVelocityY(this.gridUnit * 100);
      this.player.setGravityY(gravity);
      this.enemy.setGravityY(gravity);
      
      this.crates.children.iterate((crate: Phaser.Physics.Arcade.Sprite)=> crate.setGravityY(gravity / 10));
      this.player.setVelocityY(0);
      // this.enemy.setVelocityY(1000);
      this.physics.world.colliders.remove(this.enemyCollider);
      this.physics.world.colliders.remove(this.playerCollider);
      this.physics.world.colliders.remove(this.enemyCratesCollider);
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

    
    const measureX = getGameWidth(this); 
    const measureY = getGameHeight(this);
    const measure = measureX > measureY ? measureY : measureX;
    this.gridUnit = measure / 1000;
    // create the biggest square world that will fit on this screen.
    const setBounds = (item: Phaser.Physics.Arcade.World) => item.setBounds(0, 0, measure, measure); 
    setBounds(this.physics.world);

    
    this.crates = this.physics.add.group({
      key: 'crate',
      repeat: 9,
      setXY: { x: 100, y:100,  stepY: this.gridUnit*100 },      
      collideWorldBounds: true,    
      setScale: { x: this.gridUnit, y: this.gridUnit},
      // bounceX: 1,
      // bounceY: 1,
      dragX: 2000,
      dragY: 2000,
  });
    
    this.crates.world.setBoundsCollision();
    this.crates.children.iterate((crate: Physics.Arcade.Sprite)=> crate.setX(Phaser.Math.Between(0, getGameWidth(this))));
    
    this.player = new Player({scene:this,x:getGameWidth(this) / 2, y: getGameHeight(this) / 2}, this.gridUnit);
    this.enemy = new Enemy({scene:this,x:getGameWidth(this) / 2,y:100}, this.gridUnit);
            
    this.physics.add.overlap(this.player, this.enemy, () => this.endGame(), null, true);
    this.physics.add.overlap(this.player, this.crates, this.player.crateCollider, null, true);


    this.crates.children.iterate(crate => crate.body['onWorldBounds'] = true) 
    this.physics.world.on('worldbounds', function({gameObject: crate}){
      if (this.body.touching.down){
        this.downBlocked = true;
        this.y -= this.gridUnit * 5;
        this.xThreshold = crate.x / this.gridUnit;
      }
      if (this.body.touching.up){
        this.upBlocked = true;
        this.y += this.gridUnit * 5;
        this.xThreshold = crate.x / this.gridUnit;
      }
      if (this.body.touching.left){
        this.leftBlocked = true;
        this.x += this.gridUnit * 5;
        this.yThreshold = crate.y / this.gridUnit;
      }
      if (this.body.touching.right){
        this.rightBlocked = true;
        this.x -= this.gridUnit * 5;
        this.yThreshold = crate.y / this.gridUnit;
      }
    },this.player);
    
    this.enemyCratesCollider = this.physics.add.overlap(this.crates, this.crates, this.player.cratesOverlap);

    this.enemyCollider = this.physics.add.overlap(this.enemy, this.crates, this.enemy.cratesOverlap);
  
    this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  }

  public update() {
    
    if (this.player.isMoving() && !this.enemy.isCollidingCrate()) {
      const pos = new Phaser.Math.Vector2(this.player.x, this.player.y);
      this.enemy.exterminate(pos);
    }
    
    if (this.keySpace.isDown) {  
        this.blastOff()
    }
    this.player.update();
    this.enemy.update();
    if (this.player.body.touching.none){
      // this.player.upBlocked = false;
    }
    
  }
}
