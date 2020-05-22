import { Input, GameObjects, Physics } from 'phaser';

import Crate from '../gameobjects/Crate';
import Enemy from '../gameobjects/Enemy';
import Player from '../gameobjects/Player';
import { getGameWidth, getGameHeight } from '../helpers';
import Container = Phaser.GameObjects.Container;

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
  private player: Container;
  private enemy: Container;
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

    this.player = this.add.container(measureLong / 2, measureShort / 2, new Player({scene: this}, this.gridUnit, this.crates));
    this.enemy = this.add.container( measureLong / 2, 100, new Enemy({scene: this}, this.gridUnit));
    this.enemy.setSize(512, 512);
    this.player.setSize(32, 32);
    this.physics.world.enable(this.enemy);
    this.physics.world.enable(this.player);
    this.player.setScale(this.gridUnit / 4);
    this.enemy.setScale(this.gridUnit / 64);
    (this.player.body as Physics.Arcade.Body).setCollideWorldBounds(true);
    (this.enemy.body as Physics.Arcade.Body).onWorldBounds = true;
    this.physics.add.overlap(this.player, this.crates, (this.player.getAt(0) as Player).crateCollider, null, true);
    this.physics.add.overlap(this.player, this.enemy, () => this.endGame(), null, true);


    this.enemyCollider = this.physics.add.overlap(this.enemy, this.crates, (this.enemy.getAt(0) as Enemy).cratesOverlap);
    this.physics.add.overlap(this.player, this.rocket, () => this.blastOff(), null, true);

  }

  public update() {
    // set motion on the stars
    this.backgoundInc === 0
        ? this.background.tilePositionX -= 1
        : this.background.tilePositionY -= this.backgoundInc;

    if ((this as any).player.getAt(0).isMoving() ) {
      const pos = new Phaser.Math.Vector2(this.player.x, this.player.y);
      (this.enemy.getAt(0) as Enemy).exterminate(pos);
    }

    this.player.getAll().forEach((el) => el.update());
    this.enemy.getAll().forEach((el) => el.update());

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
