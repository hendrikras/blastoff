import {Input, GameObjects, Physics, Types} from 'phaser';

import Crate from '../gameobjects/Crate';
import Enemy from '../gameobjects/Enemy';
import Player from '../gameobjects/Player';
import Wall from '../gameobjects/Wall';
import {getGameWidth, getGameHeight, collidesOnAxes, blockedInDirection, reachedBound} from '../helpers';
import EventEmitter = Phaser.Events.EventEmitter;

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
  private fallingCrates: Crate[];
  private boundedCrates: Crate[];
  private enemyCollider: Phaser.Physics.Arcade.Collider;
  private enemyCratesCollider: Phaser.Physics.Arcade.Collider;
  private graphics;
  private background;
  private backgoundInc: number = 0;
  private gravitySpeed: number;
  private rocketCollider: Phaser.Physics.Arcade.Collider;
  private cratesPreRenderEvent: EventEmitter;

  constructor() {
    super(sceneConfig);
  }

  public create() {
    const measureX = getGameWidth(this);
    const measureY = getGameHeight(this);
    const isLandscape: boolean = measureX > measureY;
    const measureShort: number = isLandscape ? measureY : measureX;
    const measureLong: number = measureShort * 1.3;
    this.gridUnit = Math.round(measureShort / 100);
    this.gravitySpeed = this.gridUnit * 2;
    this.data.set('gridUnit', this.gridUnit);
    this.data.set('short', measureShort);
    const thickness = this.gridUnit * 5;
    const color = 0x997fff;
    const alpha = 1;
    this.graphics = this.physics.scene.add.graphics();
    this.graphics.lineStyle(thickness, color, alpha);
    this.graphics.fillStyle(color);
    this.graphics.setDepth(1);

    const getSize = (input: boolean) => input ? measureLong : measureShort;
    let startX = measureX - getSize(isLandscape);
    startX = startX === 0 ? 0 : startX / 2;
    let startY = measureY - getSize(!isLandscape);
    startY = startY === 0 ? 0 : startY / 2;
    this.graphics.strokeRect( startX + this.gridUnit * 2.5, startY + this.gridUnit * 2.5, getSize(isLandscape) - this.gridUnit * 2.5, getSize(!isLandscape) - this.gridUnit * 2.5);
    this.graphics.fillRect( 0, 0, startX, startY);

    // create the biggest world that will fit on this screen.

    this.background = this.physics.scene.add.tileSprite(getGameWidth(this) / 2, getGameHeight(this) / 2, getGameWidth(this), getGameHeight(this), 'stars');
    const setBounds = (item: Phaser.Physics.Arcade.World) => item.setBounds(startX, startY, getSize(isLandscape), getSize(!isLandscape));
    setBounds(this.physics.world);
    const tiles = this.physics.scene.add.tileSprite(getSize(isLandscape) / 2 + startX, getSize(!isLandscape) / 2 + startY, getSize(isLandscape), getSize(!isLandscape), 'tile');
    tiles.setTileScale(this.gridUnit / 7);

    const crateConfig = {
      classType: Crate, // This is the class we created
      active: true,
      visible: true,
      repeat: 9,
      setScale: { x: this.gridUnit / 10, y: this.gridUnit / 10},
      setXY: { x: 0, y: this.gridUnit * 10,  stepY: this.gridUnit * 10 },
      collideWorldBounds: true,
      key: 'crates',
    };
    this.crates = this.physics.add.group(crateConfig);
    // this.prison = this.physics.add.sprite(measureShort / 2, this.physics.world.bounds.bottom - measureShort / 20, 'prison');
    const {left, right, top, bottom, height, width} = this.physics.world.bounds;
    const half = this.gridUnit * 2.6;

    this.prison = new Crate(this, 0 , Phaser.Math.Between(top + half , bottom - half), 'prison');

    this.prison.setScale(this.gridUnit / 15 );
    this.prison.name = 'prison';
    this.prison.depth = 2;

    this.crates.add(this.prison);

    // const wall = new Wall(this, 0, 0 , 100, 100, 0xfffffff);
    const graphics = this.add.graphics();
    // const r2 = new Wall(this, left, top, this.gridUnit, height * 2, 0x9966ff);
    // r2.update();
    graphics.clear();
    graphics.clearAlpha();
    // this.graphics.clearBeforeRender
    this.rocket = this.physics.add.sprite(measureShort / 2, measureShort / 20, 'rocket');
    this.rocket.setScale( this.gridUnit / 15);
    this.rocket.setDepth(1);

    this.crates.add(this.prison);
    this.crates.setDepth(3);
    this.player = new Player({scene: this, x: measureLong / 2, y: measureShort / 2}, this.gridUnit, this.crates, 32, this.gridUnit / 4);
    this.player.setDepth(2);

    this.enemy = new Enemy({scene: this, x: measureLong / 2, y: 100}, this.gridUnit, 512, this.gridUnit / 64);
    this.enemy.setDepth(2);
    // @ts-ignore
    this.physics.add.overlap(this.player, this.crates, this.player.crateCollider, null, true);
    this.physics.add.overlap(this.player, this.enemy, () => this.endGame(), null, true);
    // @ts-ignore
    this.enemyCollider = this.physics.add.overlap(this.enemy, this.crates, this.enemy.cratesOverlap);
    this.rocketCollider = this.physics.add.overlap(this.player, this.rocket, () => this.blastOff(), null, true);
    this.fallingCrates = [];
    this.crates.children.iterate((crate: Crate, idx: number) => {
      crate.name = `crate${idx}`;
      crate.setX(Phaser.Math.Between(left + half , right - half));
      this.fallingCrates.push(crate);
    });
    this.boundedCrates = [];

    this.physics.world.on('worldbounds', (body /*, up, down, left, right*/) => {
      this.cratesPreRenderEvent = this.physics.scene.game.events.on('prerender', (/*renderer, time, delta*/) => {
        if (this.rocket.visible) {
          this.crates.children.iterate((crate: Crate, idx: number) => {
            crate.update();
          });
        } else {
          body.gameObject.update();
        }
        this.cratesPreRenderEvent.removeAllListeners();
      }, this);
    });
  }
  public update(time) {

    // set motion on the stars

    if (!this.rocket.visible) {
      this.dropEverything();
    }
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
  }
  private dropEverything() {
    const blockedCrates = [];
    this.fallingCrates.forEach((crate: Crate) => {

      const none = false;

      const collision: Types.Physics.Arcade.ArcadeBodyCollision = { up: false, down: true, right: false, left: false, none };
      const axis = 'y';
      const selection = this.fallingCrates.filter((item: Crate) => collidesOnAxes(crate, item, collision))
          .sort((a: Crate, b: Crate) => a[axis] < b[axis] ? -1 : 1 );
      const { bounds } = this.physics.world;

      selection.forEach((collidingCrate) => {
        if (blockedInDirection(crate, collidingCrate, this.gravitySpeed, collision)) {
          blockedCrates.push(crate);
        }
      });
      if (reachedBound(crate, this.gravitySpeed, collision, bounds)) {
        this.boundedCrates.push(crate);
      }
    });
    this.fallingCrates
        .filter( ( crate ) => !blockedCrates.includes( crate ) )
        .filter( ( crate ) => !this.boundedCrates.includes( crate ) )
        .forEach((crate) => {
          crate.y += this.gravitySpeed;
          crate.update();
        });
    this.player.y += this.gravitySpeed;
    this.enemy.y += this.gravitySpeed;
  }
  private blastOff() {
    this.rocket.visible = false;
    this.rocketCollider.destroy();
    // const gravity = 25000;
    this.backgoundInc = 10;
    this.physics.add.overlap(this.prison, this.enemy, () => {
        this.endGame(true);
    });

  }
}
