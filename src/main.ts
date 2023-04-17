import * as Phaser from 'phaser';
import Scenes from './scenes';

import ContainerLitePlugin from 'phaser3-rex-plugins/plugins/containerlite-plugin.js';
import CustomShapesPlugin from 'phaser3-rex-plugins/plugins/customshapes-plugin.js';
import RoundRectanglePlugin from 'phaser3-rex-plugins/plugins/roundrectangle-plugin';
// import { PhaserNavMeshPlugin } from "phaser-navmesh";
import PhaserNavMeshPlugin from './plugins/phaser-navmesh/src/phaser-navmesh-plugin';
import pasuuna from '@pinkkis/phaser-plugin-pasuuna';

const gameConfig: Phaser.Types.Core.GameConfig = {
  title: 'blastoff',

  type: Phaser.AUTO,

  scale: {
    width: window.innerWidth,
    height: window.innerHeight,
  },

  scene: Scenes,

  physics: {
    default: 'arcade',
    arcade: {
      // debug: true,
    },
  },

      plugins: {
        scene: [
          {
            key: 'PhaserNavMeshPlugin', // Key to store the plugin class under in cache
            plugin: PhaserNavMeshPlugin, // Class that constructs plugins
            mapping: 'navMeshPlugin', // Property mapping to use for the scene, e.g. this.navMeshPlugin
            start: true,
          },
        ],
        global: [
          { key: 'pasuunaplugin', plugin: pasuuna, start: true },

          { key: 'rexContainerLitePlugin', plugin: ContainerLitePlugin, start: true },
          {
            key: 'rexCustomShapesPlugin',
            plugin: CustomShapesPlugin,
            start: true,
          },
          {
            key: 'rexRoundRectanglePlugin',
            plugin: RoundRectanglePlugin,
            start: true,
          },
        ],
      },
  parent: 'game',
  backgroundColor: '#000000',
};

export const game = new Phaser.Game(gameConfig);

window.addEventListener('resize', () => {
  game.scale.refresh();
});
