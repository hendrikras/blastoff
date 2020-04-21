import { Input, GameObjects } from 'phaser';
import { getGameWidth, getGameHeight } from '../helpers';

const sceneConfig: Phaser.Types.Scenes.SettingsConfig = {
  active: false,
  visible: false,
  key: 'Game',
  physics: {
    
  }
};

export class GameScene extends Phaser.Scene {

  private speed: number = 0;
  private robotspeed: number = 500;
  private measure: number = 0;

  private cursorKeys: Phaser.Types.Input.Keyboard.CursorKeys;
  private keySpace: Phaser.Input.Keyboard.Key;
  private player: Phaser.Physics.Arcade.Sprite;
  private enemy: Phaser.Physics.Arcade.Sprite;
  private crates: Phaser.Physics.Arcade.Group
  private hasInput: boolean;  
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

  private exterminate(){
    // const getValue (first: number, second: number) => first > second :
    const enemyVelocity = new Phaser.Math.Vector2(this.player.x - this.enemy.x , this.player.y  - this.enemy.y).normalize();
    this.enemy.setVelocity(enemyVelocity.x * this.robotspeed / 2, enemyVelocity.y * this.robotspeed / 2);
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
      this.physics.world.colliders.remove(this.playerCollider);
      this.physics.world.colliders.remove(this.enemyCratesCollider);
      this.physics.world.addCollider(this.crates, this.enemy);
      this.hasInput= false;
      this.physics.add.overlap(this.crates, this.enemy, () => { 
        console.log(this.enemy.getBottomCenter().y, this.physics.world.bounds.bottom);
        if (this.enemy.getBottomCenter().y >= this.physics.world.bounds.bottom){
          this.enemy.setVisible(false);
          this.endGame(true);
        }
        // this.enemy.body.checkCollision.up
        // const test= this.enemy.body.world.checkCollision;
        // debugger;

        // this.endGame(true); 
        // console.log(this.physics.world.overlap(this.enemy, this.physics.world.bounds))
      });

  }

  public create() {
    this.hasInput = false;

    const setBounds = (item: Phaser.Physics.Arcade.World) => item.setBounds(0, 0, getGameWidth(this), getGameHeight(this));
    
    setBounds(this.physics.world);
    this.measure = getGameWidth(this) / 1000;
    const scale = this.measure;
    this.speed = scale * 500;
    this.robotspeed = this.speed;

    //  Some stars to collect, 12 in total, evenly spaced 70 pixels apart along the x axis
    this.crates = this.physics.add.group({
      key: 'crate',
      repeat: 9,
      setXY: { x: 100, y:100,  stepY: scale*100, stepX: scale*100 },      
      collideWorldBounds: true,    
      setScale: { x: scale, y: scale},
      bounceX: 1,
      bounceY: 1,
      dragX: 2000,
      dragY: 2000,
  });
    

    this.crates.world.setBoundsCollision();
    // Add a player sprite that can be moved around. Place him in the middle of the screen.
    this.player = this.physics.add.sprite(getGameWidth(this) / 2, getGameHeight(this) / 2, 'man');
    this.player.setScale(scale * 2);
    this.player.setCollideWorldBounds(true);
  
    // this.player.setBounce(1);

    this.enemy = this.physics.add.sprite(getGameWidth(this) / 2, 100, 'enemy');
    this.enemy.setCollideWorldBounds(true);
    this.enemy.setDrag(4000); 
    let test = this.enemy.body.onWorldBounds;
    test =true;
    console.log(1, this.enemy.body);

    // this.enemy.setBounce(1);
    // this.enemy.setFrame(1);
    this.enemy.setScale(scale / 3);

    
  
    this.physics.add.collider(this.crates, this.crates);
    this.playerCollider = this.physics.add.collider(this.player, this.crates);
    // this.physics.add.collider(this.enemy, this.crates);

    
    this.physics.add.overlap(this.player, this.enemy, () => this.endGame(), null, true);

    const cratesOverlap = (e:Phaser.Physics.Arcade.Sprite, e2) => {
      // e.setDrag(9999)
  
      e.setVelocity(500);
      e2.setVelocity(-500);      
    };

    const cratesOverlapEnemy = (enemy:Phaser.Physics.Arcade.Sprite, crate:Phaser.Physics.Arcade.Sprite) => {
      this.hasInput = false;

      crate.setVelocity(500);
      enemy.setVelocity(-500);      
    };

    
    this.enemyCratesCollider = this.physics.add.overlap(this.crates, this.crates, cratesOverlap);
    // this.physics.world.addOverlap(this.physics.world, this.enemy)

    
    this.enemyCollider = this.physics.add.overlap(this.enemy, this.crates, cratesOverlapEnemy);
  

    // This is a nice helper Phaser provides to create listeners for some of the most common keys.
    this.cursorKeys = this.input.keyboard.createCursorKeys();
    this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  }


  public update() {
    // Every frame, we create a new velocity for the sprite based on what keys the player is holding down.
    const velocity = new Phaser.Math.Vector2(0, 0);
    if (this.hasInput) {
  
      this.exterminate();
    }
    
    if (this.keySpace.isDown) {  
        this.blastOff()
    }
    if (this.cursorKeys.left.isDown) {
      velocity.x -= 1;
      this.hasInput= true;
    }
    if (this.cursorKeys.right.isDown) {
      velocity.x += 1;
      this.hasInput = true;
    }
    if (this.cursorKeys.up.isDown) {
      velocity.y -= 1;
      this.hasInput = true;
    }
    if (this.cursorKeys.down.isDown) {
      velocity.y += 1;
      this.hasInput = true;
    }


    // We normalize the velocity so that the player is always moving at the same speed, regardless of direction.
    const normalizedVelocity = velocity.normalize();
      this.player.setVelocity(normalizedVelocity.x * this.speed, normalizedVelocity.y * this.speed);
    
  }
}
