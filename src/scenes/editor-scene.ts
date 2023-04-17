import { Physics } from 'phaser';

import Crate from '../gameobjects/Crate';
import Wall from '../gameobjects/Wall';
import { getNavMesh } from '../helpers';

import Sprite = Phaser.Physics.Arcade.Sprite;

import { MenuButton } from '../ui/menu-button';
import { BaseScene } from './base-scene';
import ArcadePhysicsCallback = Phaser.Types.Physics.Arcade.ArcadePhysicsCallback;

const sceneConfig: Phaser.Types.Scenes.SettingsConfig = {
  active: false,
  visible: false,
  key: 'Editor',
  physics: {},
};
enum GameObjectType {
  PLAYER = 'player',
  ENEMY = 'enemy',
  WALL = 'wall',
  CRATE = 'crate',
  PRISON = 'prison',
  ROCKET = 'rocket',
  LADDER = 'ladder',
  REMOVE = 'remove',
  NONE = 'none',
}

export class EditorScene extends BaseScene {
  private editCrate: Crate;
  // create a private enum for game objects
  private GameObjectType: GameObjectType = GameObjectType.NONE;

  constructor() {
    super(sceneConfig);
  }

  public create() {
    super.create();
    const graphics = this.add.graphics();

    const color = 0xffff00;
    const thickness = 2;
    const alpha = 1;

    let draw = false;

    this.input.on('pointerdown', () => {
      draw = true;
    });

    const { bounds: worldbounds } = this.physics.world;
    const isInBounds = (x, y) => x >= worldbounds.x && x <= worldbounds.right && y >= worldbounds.y && y <= worldbounds.bottom;

    this.input.on('pointerup', (pointer) => {
      draw = false;
      graphics.clear();
      const width = pointer.x - pointer.downX;
      const height = pointer.y - pointer.downY;
      if (isInBounds(pointer.x, pointer.y) && isInBounds(pointer.downX, pointer.downY)) {
        if (this.GameObjectType === GameObjectType.WALL) {
          const cube = new this.CubeType(
            this,
            pointer.downX + width / 2,
            pointer.downY + height / 2,
            width,
            height,
            quarterCrate * 4,
            0x43464b,
            'cube',
          ) as Wall;
          cube.setStrokeStyle(this.gridUnit / 4, 0x000, 1);
          cube.drawDepth = 1;
          cube.update();
          console.log(cube);
          this.addCrate((cube as unknown) as Crate);
        } else if (this.GameObjectType === GameObjectType.LADDER) {
          const ladderScale = this.gridUnit / 10;

          const ladder = this.physics.scene.add.tileSprite(
            pointer.downX + width / 2,
            pointer.downY + height / 2,
            width,
            height,
            'pipes',
          );

          ladder.setScale(ladderScale);
          ladder.setDepth(0);
          ladder.setInteractive();

          const removeLadder = ladder.on('pointerdown', () => {
            if (this.GameObjectType === GameObjectType.REMOVE) {
              this.ladders.remove(ladder);
              ladder.destroy();
            }
          });

          this.ladders.add(ladder);
        }
      }
    });

    this.input.on('pointermove', (pointer) => {
      if (draw) {
        graphics.setDepth(4);
        graphics.clear();
        graphics.lineStyle(thickness, color, alpha);
        graphics.strokeRect(pointer.downX, pointer.downY, pointer.x - pointer.downX, pointer.y - pointer.downY);
      }
    });

    new MenuButton(this, this.gridUnit, this.gridUnit * 10, 'Add Crate', () => {
      this.GameObjectType = GameObjectType.CRATE;
    });

    new MenuButton(this, this.gridUnit, this.gridUnit * 20, 'Add Wall', () => {
      this.GameObjectType = GameObjectType.WALL;
    });

    new MenuButton(this, this.gridUnit, this.gridUnit * 30, 'Add Ladder', () => {
      this.GameObjectType = GameObjectType.LADDER;
    });

    new MenuButton(this, this.gridUnit, this.gridUnit * 40, 'Remove item', () => {
      this.GameObjectType = GameObjectType.REMOVE;
    });

    new MenuButton(this, this.gridUnit, this.gridUnit * 50, 'Save', () => {
      const crates = this.player.getCrates();
      console.log('saving', crates);
      this.scene.start('MainMenu', {crates});
    });

    new MenuButton(this, this.gridUnit, this.gridUnit * 60, 'Show', () => {
      const crates = this.player.getCrates().map((c) => this.convertMeasures(c));
      const ladders = this.ladders.getChildren().map((l) => this.convertMeasures(l as unknown as Sprite));
      const level = {
        crates,
        player: this.convertMeasures(this.player as unknown as Sprite),
        enemy: this.convertMeasures(this.enemy as unknown as Sprite),
        prison: this.convertMeasures(this.prison),
        rocket: this.convertMeasures(this.rocket),
        ladders,
        isLandscape: this.isLandscape,
      };
      console.log(level);
    });

    this.tiles.setInteractive();
    this.tiles.on('pointerdown', (pointer) => {
      switch (this.GameObjectType) {
        case GameObjectType.ROCKET:
          this.rocket.setPosition(pointer.x, pointer.y);
          this.rocket.setAlpha(1);
          this.GameObjectType = GameObjectType.NONE;
          break;
        case GameObjectType.PRISON:
          this.prison.setPosition(pointer.x, pointer.y);
          this.prison.setAlpha(1);
          this.prison.update();
          this.GameObjectType = GameObjectType.NONE;
          break;
        case GameObjectType.CRATE:
          const crate = new this.CrateType(this.scene.scene, pointer.x, pointer.y, 'crates');
          crate.setScale(this.gridUnit / 10);
          crate.setDepth(3);
          crate.update();
          crate.setInteractive();
          crate.on('pointerdown', (point) => {
            if (this.GameObjectType === GameObjectType.REMOVE) {
              this.crates.remove(crate);
              crate.destroy();
            } else {
              crate.setAlpha(0.5);
              this.editCrate = crate;
            }
          });
          this.addCrate(crate);
          break;
        case GameObjectType.LADDER:
          break;
        case GameObjectType.ENEMY:
          this.enemy.setPosition(pointer.x, pointer.y);
          break;
        case GameObjectType.PLAYER:
          this.player.setPosition(pointer.x, pointer.y);
          break;
        default:
          console.log(pointer.x, pointer.y);
          if (this.editCrate) {
            this.editCrate.setPosition(pointer.x, pointer.y);
            this.editCrate.setAlpha(1);
            this.editCrate.update();
            this.editCrate = undefined as any;
          }
          break;
      }
    });

    const quarterCrate = this.gridUnit * 2.6;
    const { centerX, centerY } = this.physics.world.bounds;
    this.prison.setInteractive();
    this.prison.setPosition(centerX, centerY);

    this.prison.on('pointerdown', (pointer) => {
      this.GameObjectType = GameObjectType.PRISON;
      this.prison.setAlpha(0.5);
    });

    // this.crates.add(this.prison);
    this.rocket.setInteractive();
    this.rocket.on('pointerdown', (pointer) => {
      this.GameObjectType = GameObjectType.ROCKET;
      this.rocket.setAlpha(0.5);
    });

    this.physics.add.overlap(this.player, this.crates, this.player.crateCollider as ArcadePhysicsCallback);

    this.ladders = this.physics.add.group();

    const polys = getNavMesh(this.crates, this.physics.world.bounds, quarterCrate * 1.2);
    this.enemy.setInteractive();
    this.enemy.on('pointerdown', (pointer) => {
      this.GameObjectType = GameObjectType.ENEMY;
    });
    this.enemy.updateMesh(polys);

    this.player.setInteractive();
    this.player.on('pointerdown', (pointer) => {
      this.GameObjectType = GameObjectType.PLAYER;
    });

    ((this.player.body as unknown) as Sprite).setCollideWorldBounds(true);
    (this.player.body as Physics.Arcade.Body).onWorldBounds = true;

    this.updatePerspectiveDrawing(null);
    this.physics.world.on('worldbounds', (body) => {
      this.updatePerspectiveDrawing(body);
    });
  }
  public update(time) {
    this.player.update();
    this.enemy.update();
  }

  private convertMeasures(crate: Sprite) {
    // convert the crates position and scale to the gridunit
    const x = crate.x / this.gridUnit;
    const y = crate.y / this.gridUnit;
    const w = crate.width / this.gridUnit;
    const h = crate.height / this.gridUnit;
    const scale = crate.scale;
    return { x, y, w, h, name: crate.name, scale: { x: crate.scale / this.gridUnit} };
  }
}
