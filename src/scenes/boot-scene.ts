import { getGameWidth, getGameHeight } from '../helpers';

const sceneConfig: Phaser.Types.Scenes.SettingsConfig = {
  active: false,
  visible: false,
  key: 'Boot',
};

/**
 * The initial scene that loads all necessary assets to the game and displays a loading bar.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(sceneConfig);
  }

  public preload() {
    const halfWidth = getGameWidth(this) * 0.5;
    const halfHeight = getGameHeight(this) * 0.5;

    const progressBarHeight = 100;
    const progressBarWidth = 400;

    const progressBarContainer = this.add.rectangle(halfWidth, halfHeight, progressBarWidth, progressBarHeight, 0x000000);
    const progressBar = this.add.rectangle(halfWidth + 20 - progressBarContainer.width * 0.5, halfHeight, 10, progressBarHeight - 20, 0x888888);

    const loadingText = this.add.text(halfWidth - 75, halfHeight - 100, 'Loading...').setFontSize(24);
    const percentText = this.add.text(halfWidth - 25, halfHeight, '0%').setFontSize(24);
    const assetText = this.add.text(halfWidth - 25, halfHeight + 100, '').setFontSize(24);

    this.load.on('progress', (value) => {
      progressBar.width = (progressBarWidth - 30) * value;

      const percent = value * 100;
      percentText.setText(`${percent}%`);
    });

    this.load.on('fileprogress', (file) => {
      assetText.setText(file.key);
    });

    this.load.on('complete', () => {
      loadingText.destroy();
      percentText.destroy();
      assetText.destroy();
      progressBar.destroy();
      progressBarContainer.destroy();

      this.scene.start('MainMenu');
    });

    this.loadAssets();
  }

  /**
   * All assets that need to be loaded by the game (sprites, images, animations, tiles, music, etc)
   * should be added to this method. Once loaded in, the loader will keep track of them, indepedent of which scene
   * is currently active, so they can be accessed anywhere.
   */
  private loadAssets() {
    // Load sample assets

    // Source: Open Game Art
    this.load.image('man', 'assets/character.png');
    this.load.image('crate', 'assets/obj_crate002.png');
    this.load.image('prison', 'assets/prison.svg');
    this.load.image('rocket', 'assets/rocket.svg');
    this.load.image('tile', 'assets/parkay-floor.svg');
    // this.load.image('enemy', 'assets/robots.svg');
    this.load.spritesheet('enemy', 'assets/robots.svg', { frameWidth: 500, frameHeight: 505 });
    this.anims.create({
      key: 'face',
      frames: [ { key: 'enemy', frame: 1 } ],
      frameRate: -1,
  });

    // this.load.spritesheet('enemy',
    // 'assets/jack_alpha.png',
    // { frameWidth: 50, frameHeight: 30 }
// );

// this.anims.create({
//   key: 'stand',
//   frames: this.anims.generateFrameNumbers('enemy', { start: 0, end: 1 }),
//   frameRate: 1,
//   repeat: -1
// });

// this.anims.create({
//   key: 'move',
//   frames: this.anims.generateFrameNumbers('enemy', { start: 1, end: 1 }),
//   frameRate: 1,
//   repeat: -1
// });

  }

}
