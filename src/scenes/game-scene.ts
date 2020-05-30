import { Input, GameObjects, Physics } from 'phaser';

import Crate from '../gameobjects/Crate';
import Enemy from '../gameobjects/Enemy';
import Player from '../gameobjects/Player';
import { getGameWidth, getGameHeight } from '../helpers';
import Container = Phaser.GameObjects.Container;
import ArcadeColliderType = Phaser.Types.Physics.Arcade.ArcadeColliderType;
import CollidesWithObjects from '../gameobjects/CollidesWithObjects';

const sceneConfig: Phaser.Types.Scenes.SettingsConfig = {
  active: false,
  visible: false,
  key: 'Game',
  physics: {

  },
};

export class GameScene extends Phaser.Scene {
  private gridUnit: number = 0;
  private keySpace: Phaser.Input.Keyboard.Key;
  private player: Player;
  private enemy: Enemy;
  private prison: Physics.Arcade.Sprite;
  private rocket: Physics.Arcade.Sprite;
  private crates: Phaser.Physics.Arcade.Group;
  private enemyCollider: Phaser.Physics.Arcade.Collider;
  private enemyCratesCollider: Phaser.Physics.Arcade.Collider;
  private graphics: any;
  private background;
  private backgoundInc: number = 0;

  constructor() {
    super(sceneConfig);
  }

  public create() {
    const measureX = getGameWidth(this);
    const measureY = getGameHeight(this);
    const landscape: boolean = measureX > measureY;
    const measureShort: number = landscape ? measureY : measureX;
    const measureLong: number = measureShort * 1.3;
    this.graphics = this.add.graphics();
    this.gridUnit = Math.round(measureShort / 100);
    const thickness = this.gridUnit;
    const color = 0x997fff;
    const alpha = 1;

    this.graphics.lineStyle(thickness, color, alpha);

    const getSize = (input: boolean) => input ? measureLong : measureShort;
    this.graphics.strokeRect(0, 0, getSize(landscape), getSize(!landscape));

    // create the biggest world that will fit on this screen.

    this.background = this.physics.scene.add.tileSprite(getGameWidth(this) / 2, getGameHeight(this) / 2, getGameWidth(this), getGameHeight(this), 'stars');
    const setBounds = (item: Phaser.Physics.Arcade.World) => item.setBounds(0, 0, getSize(landscape), getSize(!landscape));
    setBounds(this.physics.world);
    const tiles = this.physics.scene.add.tileSprite(getSize(landscape) / 2, getSize(!landscape) / 2, getSize(landscape), getSize(!landscape), 'tile');
    tiles.setTileScale(this.gridUnit / 7);

    const crateConfig = {
      classType: Crate, // This is the class we created
      active: true,
      visible: true,
      repeat: 9,
      setScale: { x: this.gridUnit / 10, y: this.gridUnit / 10},
      setXY: { x: 500, y: 100,  stepY: this.gridUnit * 10 },
      collideWorldBounds: true,
      key: 'crate',
    };
    this.crates = new Physics.Arcade.Group(this.physics.world, this, crateConfig);
    this.prison = this.physics.add.sprite(measureShort / 2, this.physics.world.bounds.bottom - measureShort / 20, 'prison');
    this.prison.setScale(this.gridUnit / 15);
    this.prison.name = 'prison';
    this.prison.depth = 2;

    this.rocket = this.physics.add.sprite(measureShort / 2, measureShort / 20, 'rocket');
    this.rocket.setScale( this.gridUnit / 15);

    this.crates.children.iterate((crate: Crate) => {
      crate.setX(Phaser.Math.Between(0, measureLong));
    });
    this.crates.add(this.prison);
    this.player = new Player({scene: this, x: measureLong / 2, y: measureShort / 2}, this.gridUnit, this.crates, 32, this.gridUnit / 4);

    this.enemy = new Enemy({scene: this, x: measureLong / 2, y: 100}, this.gridUnit, 512, this.gridUnit / 64);
    this.physics.add.overlap(this.player, this.crates, this.player.crateCollider, null, true);
    this.physics.add.overlap(this.player, this.enemy, () => this.endGame(), null, true);
    this.enemyCollider = this.physics.add.overlap(this.enemy, this.crates, this.enemy.cratesOverlap);
    this.physics.add.overlap(this.player, this.rocket, () => this.blastOff(), null, true);

  }

  public update() {
    // set motion on the stars
    this.backgoundInc === 0
        ? this.background.tilePositionX -= 1
        : this.background.tilePositionY -= this.backgoundInc;


    if (this.player.isMoving() ) {
      const pos = new Phaser.Math.Vector2(this.player.x, this.player.y);
      this.enemy.exterminate(pos);
    }

    this.player.update();
    this.enemy.update();

  }
  private endGame(won: boolean = false) {
    this.add.text( getGameWidth(this) / 2.5, getGameHeight(this) / 2, won ? 'you win' : 'game over').setFontSize(this.gridUnit * 5);
    this.physics.pause();

    // this.player.setTint(0xff0000);

  }

  private blastOff() {
    this.rocket.visible = false;
    const gravity = 25000;
    this.backgoundInc = 10;
    (this.player.body as Physics.Arcade.Body).setGravityY(gravity * 2);
    (this.enemy.body as Physics.Arcade.Body).setGravityY(gravity * 2);

    this.crates.children.iterate((crate: Phaser.Physics.Arcade.Sprite) => crate.setGravityY(gravity / 10));
    // this.player.setVelocityY(0);
    this.physics.world.colliders.remove(this.enemyCollider);
    this.physics.world.colliders.remove(this.enemyCratesCollider);
    // this.physics.world.addCollider(this.crates, this.enemy);
    this.physics.world.addCollider(this.crates, this.crates);
    this.physics.add.overlap(this.prison, this.enemy, () => {
        this.endGame(true);
    });

  }
}
