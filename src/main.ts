import * as Phaser from 'phaser';
import Scenes from './scenes';

import ContainerLitePlugin from 'phaser3-rex-plugins/plugins/containerlite-plugin.js';

const gameConfig: Phaser.Types.Core.GameConfig = {
  title: 'Sample',

  type: Phaser.AUTO,

  scale: {
    width: window.innerWidth,
    height: window.innerHeight,
  },

  scene: Scenes,

  physics: {
    default: 'arcade',
    arcade: {
      debug: true,
    },
  },

    plugins: {
      global: [{
          key: 'rexContainerLitePlugin',
          plugin: ContainerLitePlugin,
          start: true,
      }],
    },

  parent: 'game',
  backgroundColor: '#000000',
};

export const game = new Phaser.Game(gameConfig);

window.addEventListener('resize', () => {
  game.scale.refresh();
});
