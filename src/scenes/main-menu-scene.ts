import { MenuButton } from '../ui/menu-button';

const sceneConfig: Phaser.Types.Scenes.SettingsConfig = {
  active: false,
  visible: false,
  key: 'MainMenu',
};

/**
 * The initial scene that starts, shows the splash screens, and loads the necessary assets.
 */
export class MainMenuScene extends Phaser.Scene {
  private save;
  constructor() {
    super(sceneConfig);
  }
  public init (data){
    console.log(data);
    this.save = data;
  }
  public create() {
    // this.scene.start('Game');
    this.add.text(100, 50, 'This is a sample main menu. Click the "Start" button below to run your game.').setFontSize(24);

    new MenuButton(this, 100, 150, 'Start Game', () => {
      this.scene.start('Game', this.save);
    });

    new MenuButton(this, 100, 250, 'Editor', () => {
      this.scene.start('Editor');
    });

    // new MenuButton(this, 100, 250, 'Settings', () => console.log('settings button clicked'));

    new MenuButton(this, 100, 350, 'Help', () => console.log('help button clicked'));
  }
}
