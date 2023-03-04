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
  getGameWidth, getNavMesh, getRandomInt, point2Vec,
  reachedBound,
} from '../helpers';
import PerspectiveObject from '../gameobjects/PerspectiveMixin';
import CrateFace from '../gameobjects/CrateFace';
import PrisonFace from '../gameobjects/PrisonFace';
import EventEmitter = Phaser.Events.EventEmitter;
import Vector2 = Phaser.Math.Vector2;
import ArcadeBodyBounds = Phaser.Types.Physics.Arcade.ArcadeBodyBounds;
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite';
import Sprite = Phaser.Physics.Arcade.Sprite;
import GameObject = Phaser.GameObjects.GameObject;
import Body = Phaser.Physics.Arcade.Body;

const sceneConfig: Phaser.Types.Scenes.SettingsConfig = {
  active: false,
  visible: false,
  key: 'Game',
  physics: {
  },
};

export class GameScene extends Phaser.Scene {
  private gridUnit: number = 0;
  private player: Player & ContainerLite;
  private enemy: Enemy & ContainerLite;
  private prison: Physics.Arcade.Sprite;
  private rocket: Physics.Arcade.Sprite;
  private crates: Phaser.Physics.Arcade.Group;
  private ladders: Phaser.Physics.Arcade.Group;
  private fallingCrates: Crate[];
  private boundedCrates: Crate[];
  private enemyCollider: Phaser.Physics.Arcade.Collider;
  private background;
  private backgoundInc: number = 0;
  private gravitySpeed: number;
  private rocketCollider: Phaser.Physics.Arcade.Collider;
  private cratesPreRenderEvent: EventEmitter;
  private measureLong: number;

  constructor() {
    super(sceneConfig);
  }

  public create() {
    const measureX = getGameWidth(this);
    const measureY = getGameHeight(this);
    const isLandscape: boolean = measureX > measureY;
    const measureShort: number = isLandscape ? measureY : measureX;
    const measureLong: number = measureShort * 1.3;
    this.measureLong = measureLong;
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
    this.physics.world.setBounds(startX, startY, getSize(isLandscape), getSize(!isLandscape));

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

    // const pipes = this.physics.scene.add.tileSprite(getSize(isLandscape) / 2 + startX, getSize(!isLandscape) / 2 + startY, width, height, 'pipes');

    // pipes.setTileScale(this.gridUnit / 5);
    const quarterCrate = this.gridUnit * 2.6


    this.prison = new Prison(this.physics.scene, centerX, bottom, 'prison');

    this.prison.setScale(this.gridUnit / 14.1 );

    this.prison.depth = 2;

    this.crates.add(this.prison);
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
      w.drawDepth = 1;
      w.setStrokeStyle(this.gridUnit / 4, 0x000, 1);
      w.update() ;
    });

    for (let i = 0; i < getRandomInt(4); i++) {
      const long = getRandomInt(2) === 0;
      const length = 8;
      const h = long ? length : 1;
      const w = long ? 1 : length;
      const cube = new CubeType(this, centerY, centerX, quarterCrate * w, quarterCrate * h, quarterCrate * 4, 0x43464B, 'cube') as Wall;
      cube.setStrokeStyle(this.gridUnit / 4, 0x000, 1);
      cube.drawDepth = 1;
      this.crates.add(cube);
    }

    this.rocket = this.physics.add.sprite(centerX, top + quarterCrate * 2, 'rocket');
    this.rocket.setScale( this.gridUnit / 15);
    this.rocket.setDepth(1);

    this.crates.setDepth(3);
    this.enemy = new EnemyType({scene: this, x: left, y: top + quarterCrate * 2}, this.gridUnit, quarterCrate * 1.2, this.gridUnit / 4);
    this.player = new PlayerType({scene: this, x: centerX, y: bottom + this.gridUnit}, this.gridUnit, this.crates, quarterCrate, this.enemy);
    this.player.scale = 3;

    this.physics.add.overlap(this.player, this.crates, this.player.crateCollider as ArcadePhysicsCallback);
   
    this.physics.add.overlap(this.player, this.enemy, () => this.endGame());
    const cratesCollider = this.physics.add.collider(this.enemy, this.crates);
    this.enemyCollider = this.physics.add.overlap(this.enemy, this.crates, this.enemy.cratesOverlap as ArcadePhysicsCallback);
    this.rocketCollider = this.physics.add.overlap(this.player, this.rocket, () => this.blastOff());

    this.fallingCrates = [];
    const enemy = this.enemy;
    const player = this.player as ContainerLite;
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

    this.crates.children.iterate((crate) => {
      placeCrate(crate as Sprite, this.crates);
      this.fallingCrates.push(crate as Crate);
    });

    this.ladders = this.physics.add.group(ladderConfig);
    this.ladders.setDepth(0);

    this.ladders.children.iterate((ladder, idx) => {
      const size = getSize(isLandscape);
      const obj = (ladder as Sprite);
      // random number between startX and size but never less than startX
      const x = getRandomInt(size - obj.body.width) + startX + obj.body.width / 2;

      obj.setPosition(x, getSize(!isLandscape) - obj.body.height / 2, 0, 0);
    });

    this.physics.add.overlap(this.player, this.ladders, this.player.ladderCollider);

    const polys = getNavMesh(this.crates, this.physics.world.bounds, quarterCrate * 1.2);

    this.enemy.updateMesh(polys);

    (player.body as unknown as Sprite).setCollideWorldBounds(true);
    (player.body as Physics.Arcade.Body).onWorldBounds = true;

    this.boundedCrates = [];
    this.updatePerspectiveDrawing(null);
    this.physics.world.on('worldbounds', (body /*, up, down, left, right*/) => {
      this.updatePerspectiveDrawing(body);
    });
  }
  public update(time) {
    const player = this.player as ContainerLite;
    // set motion on the stars

    if (!this.rocket.visible) {
      this.dropEverything();
    }
    this.backgoundInc === 0
        ? this.background.tilePositionX -= 1
        : this.background.tilePositionY -= this.backgoundInc;

    const pos = new Vector2(player.x, player.y);
    this.enemy.exterminate(pos, this.crates);

    player.update();
    this.enemy.update();

  }
  private updatePerspectiveDrawing(body: Body | null) {
    this.cratesPreRenderEvent = this.physics.scene.game.events.on('prerender', (renderer, time) => {
      if (body) {
        const {gameObject} = body;

        if (gameObject instanceof Player && this.player.falling.down) {
          this.player.surface = true;
        } else {
          gameObject.update();
      }
      } else {
        // @ts-ignore
        this.crates.children.iterate((crate: Crate) => {
          crate.update();
        });
      }
      this.cratesPreRenderEvent.removeAllListeners();
    }, this);
  }
  private endGame(won: boolean = false) {
    this.enemy.clearMesh();

    this.add
        .text( getGameWidth(this) / 2.5, getGameHeight(this) / 2, won ? 'You Win' : 'Game Over').setFontSize(this.gridUnit * 5)
        .setDepth(5);
    this.physics.pause();
    this.scene.pause();
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
