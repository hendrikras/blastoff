import { Physics, Math as PMath, Scene } from 'phaser';
import Enemy from './Enemy';

class Crate extends Physics.Arcade.Sprite {
    get enemy(): Enemy {
        return this.$enemy;
    }
    set enemy(value: Enemy) {
        this.$enemy = value;
    }
    get player(): boolean {
        return this.$player;
    }
    set player(value: boolean) {
        this.$player = value;

    }
    private $player: boolean = false;
    private $enemy?: Enemy = null;
    constructor(scene: Scene, x: number , y: number, name) {
       super(scene, x, y, name);

       scene.add.existing(this);
       scene.physics.add.existing(this);
       this.name = name;
       this.setFrame(PMath.Between(0, 4));
       this.setCollideWorldBounds();
       // @ts-ignore
       this.body.onWorldBounds = true;

        // @ts-ignore
       this.drawPoints = this.drawFace;
        // @ts-ignore
       this.update = this.draw;
    }
}

export default Crate;
