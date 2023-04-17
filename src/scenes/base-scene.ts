import {Physics} from 'phaser';

import Crate from '../gameobjects/Crate';
import Enemy from '../gameobjects/Enemy';
import Player from '../gameobjects/Player';
import Wall from '../gameobjects/Wall';
import {
  Collision4Direction,
  Direction,
  getGameHeight,
  getGameWidth, point2Vec,
} from '../helpers';
import PerspectiveObject from '../gameobjects/PerspectiveMixin';
import CrateFace from '../gameobjects/CrateFace';
import PrisonFace from '../gameobjects/PrisonFace';
import EventEmitter = Phaser.Events.EventEmitter;
import Vector2 = Phaser.Math.Vector2;
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite';
import Sprite = Phaser.Physics.Arcade.Sprite;
import Body = Phaser.Physics.Arcade.Body;

export class BaseScene extends Phaser.Scene {
  protected gridUnit: number = 0;
  protected player: Player & ContainerLite;
  protected enemy: Enemy & ContainerLite;
  protected prison: Physics.Arcade.Sprite;
  protected rocket: Physics.Arcade.Sprite;
  protected crates: Phaser.Physics.Arcade.Group;
  protected ladders: Phaser.Physics.Arcade.Group;
  protected background;
  protected backgoundInc: number = 0;
  protected gravitySpeed: number;
  protected cratesPreRenderEvent: EventEmitter;
  protected measureLong: number;
  protected measureShort: number;
  protected quarterCrate: number;
  protected startX: number;
  protected startY: number;
  protected isLandscape: boolean = false;
  protected CrateType;
  protected CubeType;
  protected tiles;

  constructor(sceneConfig: Phaser.Types.Scenes.SettingsConfig) {
    super(sceneConfig);
  }

  public create() {
    this.crates = new Phaser.Physics.Arcade.Group(this.physics.world, this.scene.scene);

    const measureX = getGameWidth(this);
    const measureY = getGameHeight(this);
    this.isLandscape = measureX > measureY;
    this.measureShort = this.isLandscape ? measureY : measureX;
    this.measureLong = this.measureShort * 1.3;

    this.gridUnit = Math.round(this.measureShort / 100);
    this.gravitySpeed = this.gridUnit * 2;
    this.data.set('gridUnit', this.gridUnit);
    this.data.set('short', this.measureShort);

    this.startX = measureX - this.getSize(this.isLandscape);
    this.startX = this.startX === 0 ? 0 : this.startX / 2;
    this.startY = measureY - this.getSize(!this.isLandscape);
    this.startY = this.startY === 0 ? 0 : this.startY / 2;
    // create the biggest world that will fit on this screen.

    this.background = this.physics.scene.add.tileSprite(getGameWidth(this) / 2, getGameHeight(this) / 2, getGameWidth(this), getGameHeight(this), 'stars');
    this.physics.world.setBounds(this.startX, this.startY, this.getSize(this.isLandscape), this.getSize(!this.isLandscape));

    const {left, right, top, bottom, height, width, centerX, centerY} = this.physics.world.bounds;
    this.tiles = this.physics.scene.add.tileSprite(this.getSize(this.isLandscape) / 2 + this.startX, this.getSize(!this.isLandscape) / 2 + this.startY, width, height, 'tile');
    this.tiles.setTileScale(this.gridUnit / 7);
    this.CrateType =  PerspectiveObject(CrateFace(Crate));
    this.CubeType =  PerspectiveObject(CrateFace(Wall));
    const Prison =  PerspectiveObject(PrisonFace(Crate));
    const EnemyType = PerspectiveObject(Enemy);

    const PlayerType = PerspectiveObject(Player);

    const quarterCrate = this.gridUnit * 2.6;
    this.quarterCrate = quarterCrate;

    this.prison = new Prison(this.physics.scene, centerX, centerY, 'prison');

    this.prison.setScale(this.gridUnit / 14.1 );

    this.prison.depth = 2;

    this.crates.add(this.prison);
    this.CubeType = PerspectiveObject(Wall);

    // const wall = new Wall(this, 0 , 0, 'prison', new Vector2(2,4));
    const wallcolor = 0xc0bdc3;
    const edge = quarterCrate / 2;
    const up = 'up';
    const down = 'down';
    const dirright = 'right';
    const dirleft = 'left';
    const CubeType = this.CubeType;
    const walltop = new CubeType(this, centerX, top - edge / 2 , width, edge, quarterCrate * 4, wallcolor, down, Collision4Direction(Direction.down));
    const wallbottom = new CubeType(this, centerX, bottom + edge / 2 , width, edge, quarterCrate * 4, wallcolor, up, Collision4Direction(Direction.up));
    const wallleft = new CubeType(this, left - edge / 2, centerY , edge, height, quarterCrate * 4, wallcolor, dirright, Collision4Direction(Direction.right));
    const wallright = new CubeType(this, right + edge / 2, centerY , edge, height, quarterCrate * 4, wallcolor, dirleft, Collision4Direction(Direction.left));

    const CrateType = PerspectiveObject(CrateFace(Crate));
    this.CrateType = CrateType;

    const walls = [walltop, wallbottom, wallleft, wallright];
    walls.forEach((w: Wall) => {
      w.drawDepth = 1;
      w.setStrokeStyle(this.gridUnit / 4, 0x000, 1);
      w.update() ;
    });

    this.rocket = this.physics.add.sprite(centerX, top + quarterCrate * 2, 'rocket');
    this.rocket.setScale( this.gridUnit / 15);
    this.rocket.setDepth(1);

    this.crates.setDepth(3);
    this.enemy = new EnemyType({scene: this, x: left, y: top + quarterCrate * 2}, this.gridUnit, quarterCrate * 1.2, this.gridUnit / 4);
    this.player = new PlayerType({scene: this, x: centerX, y: bottom + this.gridUnit}, this.gridUnit, this.crates, quarterCrate, this.enemy);
    this.player.scale = 3;

    (this.player.body as unknown as Sprite).setCollideWorldBounds(true);
    (this.player.body as Physics.Arcade.Body).onWorldBounds = true;

    this.updatePerspectiveDrawing(null);
    this.physics.world.on('worldbounds', (body /*, up, down, left, right*/) => {
      this.updatePerspectiveDrawing(body);
    });
  }
  public update(time) {
    const player = this.player;
    // set motion on the stars

    this.backgoundInc === 0
        ? this.background.tilePositionX -= 1
        : this.background.tilePositionY -= this.backgoundInc;

    const pos = new Vector2(player.x, player.y);

    this.enemy.exterminate(pos, this.crates);

    player.update();
    this.enemy.update();

  }
//   public init(data) {

//   }
  protected getSize(input: boolean): number {
    return input ? this.measureLong : this.measureShort;
  }
  protected addCrate(crate: Crate) {
    this.crates.add(crate);
    this.player.addCrate(crate);
  }

  protected updatePerspectiveDrawing(body: Body | null) {
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
}
