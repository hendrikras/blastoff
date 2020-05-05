import { Input, GameObjects, Physics } from 'phaser';

import Crate from '../gameobjects/Crate';
import Enemy from '../gameobjects/Enemy';
import Player from '../gameobjects/Player';
import { getGameWidth, getGameHeight } from '../helpers';

const gutterSpace = 5;

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
  private graphics: any;

  constructor() {
    super(sceneConfig);
    this.crates;
  }
  private endGame(won: boolean = false) {
    this.add.text( getGameWidth(this) / 2.5, getGameHeight(this) / 2, won ? 'you win' :'game over').setFontSize(this.gridUnit * 5);
    this.physics.pause();

    this.player.setTint(0xff0000);

  }

  private blastOff(){
    const gravity = this.gridUnit * 3000;
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
      this.physics.world.addCollider(this.crates, this.crates);
      
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
    this.graphics = this.add.graphics();

    var thickness = 2;
    var color = 0xff0000;
    var alpha = 1;

    this.graphics.lineStyle(thickness, color, alpha);
    
    const landscape: boolean = measureX > measureY;
    const measureShort: number = landscape ? measureY : measureX;
    const measureLong: number = measureShort * 1.3;
    const getSize = (input: boolean) => input ? measureLong : measureShort;
    this.graphics.strokeRect(0, 0, getSize(landscape), getSize(!landscape));
    this.gridUnit = Math.round(measureShort / 100);
    console.log(4, this.gridUnit)
    // create the biggest world that will fit on this screen.
    const setBounds = (item: Phaser.Physics.Arcade.World) => item.setBounds(0, 0, getSize(landscape), getSize(!landscape)); 
    setBounds(this.physics.world);

    const crateConfig = {
			classType: Crate, // This is the class we created
			active: true,
      visible: true,
      repeat: 9,
      setScale: { x: this.gridUnit /10, y: this.gridUnit /10},
      setXY: { x: 500, y:100,  stepY: this.gridUnit*10 },      
      collideWorldBounds: true,
			key: 'crate'
    }
    this.crates = new Physics.Arcade.Group(this.physics.world, this, crateConfig);
    
    this.crates.children.iterate((crate: Crate, itx)=> {    
      crate.name = itx.toString(); 
      crate.setX(Phaser.Math.Between(0, measureLong));      
    });
    
    this.player = new Player({scene:this,x:measureLong / 2, y: measureShort / 2}, this.gridUnit, this.crates);
    this.enemy = new Enemy({scene:this,x:measureLong / 2,y:100}, this.gridUnit);
            
    this.physics.add.overlap(this.player, this.enemy, () => this.endGame(), null, true);
    


    this.crates.children.iterate(crate => crate.body['onWorldBounds'] = true) 
    this.physics.world.on('worldbounds', function({gameObject: crate}){

      if (crate !== this.scene.enemy){
        if (this.body.touching.down){
          this.downBlocked = true;
          this.y -= gutterSpace;
          this.xThreshold = crate.x / this.gridUnit;
        }
        if (this.body.touching.up){
          this.upBlocked = true;
          this.y += gutterSpace;
          this.xThreshold = crate.x / this.gridUnit;
        }
        if (this.body.touching.left){
          this.leftBlocked = true;
          this.x += gutterSpace;
          this.yThreshold = crate.y / this.gridUnit;
        }
        if (this.body.touching.right){
          this.rightBlocked = true;
          this.x -= gutterSpace;
          this.yThreshold = crate.y / this.gridUnit;
        }
      }
    },this.player);

    (this as any).enemy.body['onWorldBounds'] = true;

    this.physics.world.on('worldbounds', function({gameObject: enemy}){
      if (enemy === this){
        this.chasePlayer = true;
      } 
    },this.enemy);

    

    
    // this.enemyCratesCollider = this.physics.add.overlap(this.crates, this.crates, this.player.cratesOverlap);

    this.enemyCollider = this.physics.add.overlap(this.enemy, this.crates, this.enemy.cratesOverlap);
  
    this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  }

  public update() {
    
    if (this.player.isMoving() && this.enemy.body.touching.none) {
      const pos = new Phaser.Math.Vector2(this.player.x, this.player.y);
      this.enemy.exterminate(pos);
    }
    
    if (this.keySpace.isDown) {  
        this.blastOff()
    }
    this.player.update();
    this.enemy.update();
    
  }
}
