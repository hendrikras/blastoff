import {Physics, Types} from 'phaser';

import Crate from '../gameobjects/Crate';

import {
  blockedInDirection,
  collidesOnAxes,
  getGameHeight,
  getGameWidth,
  getNavMesh,
  reachedBound,
} from '../helpers';

import Sprite = Phaser.Physics.Arcade.Sprite;
import { BaseScene } from './base-scene';
import levels from '../../assets/levels.json';

import ArcadePhysicsCallback = Phaser.Types.Physics.Arcade.ArcadePhysicsCallback;
import GameObject = Phaser.GameObjects.GameObject;
import TileSprite = Phaser.GameObjects.TileSprite;

const sceneConfig: Phaser.Types.Scenes.SettingsConfig = {
  active: false,
  visible: false,
  key: 'Game',
  physics: {
  },
};

// const levelName = 'level1';
const levelName = 'tutorial1';

export class GameScene extends BaseScene {

  private fallingCrates: Crate[];
  private boundedCrates: Crate[] = [];
  private enemyCollider: Phaser.Physics.Arcade.Collider;
  private rocketCollider: Phaser.Physics.Arcade.Collider;

  constructor() {
    super(sceneConfig);
  }

  public create() {
    super.create();

    // add crates with config
    const crateGroup = this.physics.add.group();
    // this.levelData.crates?.forEach((crate) => {
    //   this.addCrate(crate);
    //   crate.update();
    // });

    levels[levelName].crates.forEach((gameObj) => {
      const coords = this.flipCoordsForAspect(gameObj);
      const crate = {...gameObj, ...coords};
      const vals = [crate.x, crate.y, crate.w, crate.h].map((n) => n * this.gridUnit);
      const [x, y, w, h] = vals;
      switch (crate.name) {
        case 'cube':
          const depth = this.gridUnit * 2.6 * 4;

          const cube = new this.CubeType( this, x, y, w, h, depth, 0x43464b, crate.name);
          cube.setStrokeStyle(this.gridUnit / 4, 0x000, 1);
          cube.drawDepth = 2;
          this.addCrate(cube);
          break;
        case 'crates':
          const c = new this.CrateType(this.scene.scene, crate.x * this.gridUnit, crate.y * this.gridUnit, crate.name);
          c.setScale(crate.scale.x * this.gridUnit, crate.scale.x * this.gridUnit);
          c.update();
          this.addCrate (c);
          break;
        case 'prison':
          this.prison.setPosition(crate.x * this.gridUnit, crate.y * this.gridUnit);
          break;
    }});
    
    // set the position of the remaining game objects based on aspect ratio
    ['player', 'enemy', 'rocket'].forEach((name) => {
      const p = this.flipCoordsForAspect(levels[levelName][name])
      this[name].setPosition(p.x * this.gridUnit, p.y * this.gridUnit);
    })

    this.crates.setDepth(3);

    const quarterCrate = this.quarterCrate;

    this.physics.add.overlap(this.player, this.crates, this.player.crateCollider as ArcadePhysicsCallback);
    this.physics.add.overlap(this.player, this.enemy, () => this.endGame());
    const cratesCollider = this.physics.add.collider(this.enemy, this.crates);
    this.enemyCollider = this.physics.add.overlap(this.enemy, this.crates, this.enemy.cratesOverlap as ArcadePhysicsCallback);
    this.rocketCollider = this.physics.add.overlap(this.player, this.rocket, () => this.blastOff());
    this.fallingCrates = [];

    this.crates.children.iterate((crate: GameObject) => {
      this.fallingCrates.push(crate as Crate);
      return true;
    });
    this.ladders = this.physics.add.group();
    this.ladders.setDepth(0);
    const ladderScale = this.gridUnit / 10;

    levels[levelName].ladders.forEach((gameObj) => {
      const coords = this.flipCoordsForAspect(gameObj);
      const box = {...gameObj, ...coords};
      const vals = [box.x, box.y, box.w, box.h].map((n) => n * this.gridUnit);
      const [x, y, w, h] = vals;
      const ladder = new TileSprite(this, x, y, w, h, 'pipes');
      ladder.setScale(ladderScale);
      ladder.setDepth(0);
      ladder.setInteractive();

      this.ladders.add(ladder, true);
    });

    this.physics.add.overlap(this.player, this.ladders, this.player.ladderCollider as ArcadePhysicsCallback);
    const polys = getNavMesh(this.crates, this.physics.world.bounds, quarterCrate * 1.2);
    this.enemy.updateMesh(polys);
  }
  public update(time) {
    super.update(time);
    if (!this.rocket.visible) {
      this.dropEverything();
    }
  }

  private flipCoordsForAspect(p: {x: number, y: number, w: number, h: number}) {
    return this.isLandscape && levels[levelName].isLandscape ? {x: p.x, y: p.y, h: p.h, w: p.w} : {x: p.y, y: p.x, h: p.w, w: p.h};
  }
  private endGame(won: boolean = false) {
    this.enemy.clearMesh();

    this.add
        .text( getGameWidth(this) / 2.5, getGameHeight(this) / 2, won ? 'You Win' : 'Game Over').setFontSize(this.gridUnit * 5)
        .setDepth(5);
    this.physics.pause();
    this.scene.start('MainMenu', {end: 'end'});
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
    const gameObject = this.player.body?.gameObject || {bottom: 0};
    if (gameObject.bottom <= this.physics.world.bounds.bottom) {
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
