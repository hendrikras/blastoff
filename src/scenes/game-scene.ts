import {Physics, Types} from 'phaser';

import Crate from '../gameobjects/Crate';
import Enemy from '../gameobjects/Enemy';
import Player from '../gameobjects/Player';
import Wall from '../gameobjects/Wall';
import {
  blockedInDirection,
  collidesOnAxes,
  Collision4Direction,
  Direction,
  getGameHeight,
  getGameWidth, getRandomInt, point2Vec,
  reachedBound,
} from '../helpers';
import PerspectiveObject from '../gameobjects/PerspectiveMixin';
import CrateFace from '../gameobjects/CrateFace';
import PrisonFace from '../gameobjects/PrisonFace';
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite';
import EventEmitter = Phaser.Events.EventEmitter;
import Vector2 = Phaser.Math.Vector2;

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
  private player: ContainerLite;
  private enemy: ContainerLite;
  private prison: Physics.Arcade.Sprite;
  private rocket: Physics.Arcade.Sprite;
  private crates: Phaser.Physics.Arcade.Group;
  private fallingCrates: Crate[];
  private boundedCrates: Crate[];
  private enemyCollider: Phaser.Physics.Arcade.Collider;
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

    const getSize = (input: boolean) => input ? measureLong : measureShort;
    let startX = measureX - getSize(isLandscape);
    startX = startX === 0 ? 0 : startX / 2;
    let startY = measureY - getSize(!isLandscape);
    startY = startY === 0 ? 0 : startY / 2;
    // create the biggest world that will fit on this screen.
    this.background = this.physics.scene.add.tileSprite(getGameWidth(this) / 2, getGameHeight(this) / 2, getGameWidth(this), getGameHeight(this), 'stars');
    const setBounds = (item: Phaser.Physics.Arcade.World) => item.setBounds(startX, startY, getSize(isLandscape), getSize(!isLandscape));
    setBounds(this.physics.world);
    const {left, right, top, bottom, height, width, centerX, centerY} = this.physics.world.bounds;

    const tiles = this.physics.scene.add.tileSprite(getSize(isLandscape) / 2 + startX, getSize(!isLandscape) / 2 + startY, width, height, 'tile');
    tiles.setTileScale(this.gridUnit / 7);
    const CrateType =  PerspectiveObject(CrateFace(Crate));
    const Prison =  PerspectiveObject(PrisonFace(Crate));
    const EnemyType = PerspectiveObject(Enemy);

    const PlayerType = PerspectiveObject(Player);

    const crateConfig = {
      classType: CrateType, // This is the class we created
      active: true,
      visible: true,
      repeat: 9,
      setScale: { x: this.gridUnit / 10, y: this.gridUnit / 10},
      collideWorldBounds: true,
      key: 'crates',
    };
    this.crates = this.physics.add.group(crateConfig);

    this.prison = new Prison(this.physics.scene, centerX, bottom, 'prison');
    this.prison.setRandomPosition();
    const quarterCrate = this.gridUnit * 2.6;

    this.prison.setScale(this.gridUnit / 14.1 );

    this.prison.depth = 2;

    // this.crates.add(this.prison);
    const CubeType = PerspectiveObject(Wall);

    // const wall = new Wall(this, 0 , 0, 'prison', new Vector2(2,4));
    const wallcolor = 0xc0bdc3;
    const edge = quarterCrate / 2;
    const up = 'up';
    const down = 'down';
    const dirright = 'right';
    const dirleft = 'left';
    const walltop = new CubeType(this, centerX, top - edge / 2 , width, edge, quarterCrate * 4, wallcolor, down, Collision4Direction(Direction.down));
    const wallbottom = new CubeType(this, centerX, bottom + edge / 2 , width, edge, quarterCrate * 4, wallcolor, up, Collision4Direction(Direction.up));
    const wallleft = new CubeType(this, left - edge / 2, centerY , edge, height, quarterCrate * 4, wallcolor, dirright, Collision4Direction(Direction.right));
    const wallright = new CubeType(this, right + edge / 2, centerY , edge, height, quarterCrate * 4, wallcolor, dirleft, Collision4Direction(Direction.left));
    const walls = [walltop, wallbottom, wallleft, wallright];
    walls.forEach((w: Wall) => {
      w.setStrokeStyle(this.gridUnit / 4, 0x000, 1);
      w.update() ;
    });
    // for (let i = 0; i < getRandomInt(4); i++) {
    //   const cube = new CubeType(this, centerY, centerX, quarterCrate * 4, quarterCrate * 4, quarterCrate * 4, 0x43464B, 'cube') as Wall;
    //   cube.setStrokeStyle(this.gridUnit / 4, 0x000, 1);
    //
    //   this.crates.add(cube);
    // }

    this.rocket = this.physics.add.sprite(centerX, top + quarterCrate * 2, 'rocket');
    this.rocket.setScale( this.gridUnit / 15);
    this.rocket.setDepth(1);

    this.crates.add(this.prison);
    this.crates.setDepth(3);
    this.player = new PlayerType({scene: this, x: centerX, y: centerY}, this.gridUnit, this.crates, quarterCrate, this.gridUnit / 4);
    this.player.scale = 3;
    this.enemy = new EnemyType({scene: this, x: centerX, y: top + quarterCrate * 2}, this.gridUnit, quarterCrate * 1.2, this.gridUnit / 4);
    // @ts-ignore
    this.physics.add.overlap(this.player, this.crates, this.player.crateCollider, null, true);
    // @ts-ignore
    this.physics.add.overlap(this.player, this.enemy, () => this.endGame(), null, true);
    // @ts-ignore
    this.enemyCollider = this.physics.add.overlap(this.enemy, this.crates, this.enemy.cratesOverlap);
    // @ts-ignore
    this.rocketCollider = this.physics.add.overlap(this.player, this.rocket, () => this.blastOff(), null, true);
    this.fallingCrates = [];
    // @ts-ignore

    function placeCrate(crate, crates) {
      crate.setRandomPosition(startX, startY, width, height);
      crates.children.iterate((item) => {
        if (item !== crate) {
          const pos = point2Vec(item as Vector2);
          if (pos.distance(crate) < crate.width) {
            placeCrate(crate, crates);
          }
        }
      });
    }

    this.crates.children.iterate((crate, idx) => {
      console.log(crate.name);
      if (crate.name !== 'prison') {
        placeCrate(crate, this.crates);
      } else {
        crate.name = `crate${idx}`;
      }
      this.fallingCrates.push(crate as Crate);
    });
    this.boundedCrates = [];
    this.updatePerspectiveDrawing();
    this.physics.world.on('worldbounds', (body /*, up, down, left, right*/) => {
      this.updatePerspectiveDrawing(body);
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
  private updatePerspectiveDrawing(body = null) {
    this.cratesPreRenderEvent = this.physics.scene.game.events.on('prerender', (renderer, time) => {
      if (body) {
        // @ts-ignore
        body.gameObject.update();
      } else {
        // @ts-ignore
        this.crates.children.iterate((crate: Crate) => {
          // console.log(time);
          crate.update();
        });
      }
      this.cratesPreRenderEvent.removeAllListeners();
    }, this);
  }
  private endGame(won: boolean = false) {
    this.add
        .text( getGameWidth(this) / 2.5, getGameHeight(this) / 2, won ? 'you win' : 'game over').setFontSize(this.gridUnit * 5)
        .setDepth(5);
    this.physics.pause();
    this.scene.pause();
  }
  private dropEverything() {
    // debugger;
    const blockedCrates: Crate[] = [];
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
          if (crate instanceof Crate) {
            crate.y += this.gravitySpeed;
            crate.update();
          }
        });
    if (!this.player.isBlockedDirection('down')) {
      this.player.y += this.gravitySpeed;
    }
    if (!this.enemy.isBlockedDirection('down')) {
      this.enemy.y += this.gravitySpeed;
    }
  }
  private blastOff() {
    if (this.rocket.visible){
      this.scene.scene.cameras.main.shake(500, 0.01);
    }
    this.rocket.visible = false;
    this.rocketCollider.destroy();
    this.backgoundInc = 10;
    // if (this.player.y <= this.physics.world.bounds.bottom - this.player.height) {
    //   // console.log (this.player.y);
    //   this.endGame();
    // }
    this.physics.add.overlap(this.prison, this.enemy, () => {

        if (this.enemy.y <= this.physics.world.bounds.bottom - this.enemy.height) {
          this.endGame(true);
          this.enemy.x = this.prison.x;
          this.enemy.y = this.prison.y;
        }
    });

  }
}
