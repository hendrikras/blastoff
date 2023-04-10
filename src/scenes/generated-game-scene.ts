import {Types} from 'phaser';

import Crate from '../gameobjects/Crate';
import Wall from '../gameobjects/Wall';
import {
  blockedInDirection,
  collidesOnAxes,
  getGameHeight,
  getGameWidth, getNavMesh, getRandomInt, point2Vec,
  reachedBound,
} from '../helpers';
import Vector2 = Phaser.Math.Vector2;

import Sprite = Phaser.Physics.Arcade.Sprite;

import { BaseScene } from './base-scene';

const sceneConfig: Phaser.Types.Scenes.SettingsConfig = {
  active: false,
  visible: false,
  key: 'Game',
  physics: {
  },
};

export class GameScene extends BaseScene{

  private fallingCrates: Crate[];
  private boundedCrates: Crate[] = [];
  private enemyCollider: Phaser.Physics.Arcade.Collider;
  private levelData;

  private rocketCollider: Phaser.Physics.Arcade.Collider;
  // private data;

  constructor() {
    super(sceneConfig);
  }
  public init (data){
    this.levelData = data;
  }
  public create() {
    super.create();
  
    const crateConfig = {
      classType: this.CrateType, // This is the class we created
      active: true,
      visible: true,
      repeat: 9,
      setScale: { x: this.gridUnit / 10, y: this.gridUnit / 10},
      collideWorldBounds: true,
      key: 'crates',
    };
    // this.crates = this.physics.add.group(crateConfig);
    
    // add crates with config
    const crateGroup = this.physics.add.group(crateConfig);
    
    // convert crateGroup to array
    crateGroup.getChildren().forEach(crate => this.addCrate(crate as any));

    this.crates.setDepth(3);

    // exted base

    const ladderScale = this.gridUnit / 10;
    // create a collection of sprites that do not collide with the player or crate
    const ladderConfig = {
      classType: Sprite,
      active: true,
      visible: true,
      repeat: 1,
      setScale: { x: ladderScale, y: ladderScale},
      key: 'pipes'
    };
  
    const quarterCrate = this.quarterCrate;

    const {startX, startY, enemy, player} = this;
    const {height, width, centerX, centerY} = this.physics.world.bounds;
    function placeCrate(crate: Sprite, crates: Phaser.Physics.Arcade.Group) {
      crate.setRandomPosition(startX, startY, width, height);
      crates.children.iterate((item) => {
        if (item !== crate) {
          const pos = point2Vec(item as unknown as Vector2);
          const cratePos = point2Vec(crate);
          const rad = quarterCrate * 6;
          if (pos.distance(crate) <= rad || cratePos.distance(enemy as unknown as Vector2) <= rad || cratePos.distance(player) <= rad) {
            placeCrate(crate, crates);
          }
        }
      });
    }

    for (let i = 0; i < getRandomInt(4); i++) {
      const long = getRandomInt(2) === 0;
      const length = 8;
      const h = long ? length : 1;
      const w = long ? 1 : length;
      const cube = new this.CubeType(this, centerY, centerX, quarterCrate * w, quarterCrate * h, quarterCrate * 4, 0x43464B, 'cube') as Wall;
      cube.setStrokeStyle(this.gridUnit / 4, 0x000, 1);
      cube.drawDepth = 1;
      this.crates.add(cube);
    }

    this.physics.add.overlap(this.player, this.crates, this.player.crateCollider as ArcadePhysicsCallback);
   
    this.physics.add.overlap(this.player, this.enemy, () => this.endGame());
    const cratesCollider = this.physics.add.collider(this.enemy, this.crates);
    this.enemyCollider = this.physics.add.overlap(this.enemy, this.crates, this.enemy.cratesOverlap as ArcadePhysicsCallback);
    this.rocketCollider = this.physics.add.overlap(this.player, this.rocket, () => this.blastOff());
    this.fallingCrates = [];

    this.crates.children.iterate((crate) => {

      placeCrate(crate as Sprite, this.crates);
      this.fallingCrates.push(crate as Crate);
    });
    this.ladders = this.physics.add.group(ladderConfig);
    this.ladders.setDepth(0);
    this.ladders.children.iterate((ladder, idx) => {
      const size = this.getSize(this.isLandscape);
      const obj = (ladder as Sprite);
      // random number between startX and size but never less than startX
      const x = getRandomInt(size - obj.body.width) + startX + obj.body.width / 2;
      obj.setPosition(x, this.getSize(!this.isLandscape) - obj.body.height / 2, 0, 0);
    });
    this.physics.add.overlap(this.player, this.ladders, this.player.ladderCollider);
    const polys = getNavMesh(this.crates, this.physics.world.bounds, quarterCrate * 1.2);
    this.enemy.updateMesh(polys);
  }
  public update(time) {
    super.update(time);
    if (!this.rocket.visible) {
      this.dropEverything();
    }
  }
  private endGame(won: boolean = false) {
    this.enemy.clearMesh();

    this.add
        .text( getGameWidth(this) / 2.5, getGameHeight(this) / 2, won ? 'You Win' : 'Game Over').setFontSize(this.gridUnit * 5)
        .setDepth(5);
    this.physics.pause();
    this.scene.start("MainMenu", {end: 'end'})
  }
  private dropEverything() {
    const blockedCrates: Crate[] = [];
    const collision: Types.Physics.Arcade.ArcadeBodyCollision = { up: false, down: true, right: false, left: false, none: false };
    this.fallingCrates.forEach((crate: Crate) => {
      const axis = 'y';
      const selection = this.fallingCrates
          .filter((item: Crate) => crate !== item  && collidesOnAxes(crate, item, collision, this.measureLong))
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
          if (crate instanceof Crate) {
            crate.y += this.gravitySpeed;
            crate.update();
          }
        });
    const noDirection = { up: false, down: false, right: false, left: false, none: true };

    if (!(this.player).isBlockedDirection('down') && !this.player.getOnLadder()) {
      (this.player).y += this.gravitySpeed;
      this.player.setFalling(collision);
    }
    if (!this.enemy.isBlockedDirection('down')) {
      this.enemy.y += this.gravitySpeed;
      this.enemy.setFalling(collision);
    } else {
      this.enemy.setFalling(noDirection);
    }
  }
  private blastOff() {
    if (this.rocket.visible) {
      this.scene.scene.cameras.main.shake(500, 0.01);
    }
    this.rocket.visible = false;
    this.rocketCollider.destroy();
    this.backgoundInc = 10;
    if (this.player.body.gameObject.bottom <= this.physics.world.bounds.bottom) {
      this.endGame();
    }
    this.physics.add.overlap(this.prison, this.enemy, () => {

        if (this.enemy.y <= this.physics.world.bounds.bottom - this.enemy.height) {
          this.endGame(true);
          this.enemy.x = this.prison.x;
          this.enemy.y = this.prison.y;
        }
    });

  }
}
