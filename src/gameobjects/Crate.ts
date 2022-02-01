import { Physics, Math as PMath, Scene } from 'phaser';
import Enemy from './Enemy';
import {PerspectiveMixinType} from './PerspectiveMixin';

import GameObject = Phaser.GameObjects.GameObject;

class Crate extends Physics.Arcade.Sprite {
    get enemy(): Enemy | null {
        return this.$enemy;
    }
    set enemy(value: Enemy | null) {
        this.$enemy = value;
    }
    get player(): boolean {
        return this.$player;
    }
    set player(value: boolean) {
        this.$player = value;

    }
    private $player: boolean = false;
    private $enemy: Enemy | null = null;
    constructor(scene: Scene, x: number , y: number, name) {
       super(scene, x, y, name);

       scene.add.existing(this);
       scene.physics.add.existing(this);
       this.name = name;
       this.setFrame(PMath.Between(0, 4));
       this.setCollideWorldBounds();
       const body = ((this as unknown as GameObject).body as Physics.Arcade.Body);
       body.onWorldBounds = true;
       this.setPushable(false);
       // body.setEnable(true);
       // body.setBounce(3,3);

        // @ts-ignore
       this.drawPoints = this.drawFace;
    }

    public update() {
        const that = this as unknown as PerspectiveMixinType;
        that.graphics.clear();
        that.predraw();
        that.drawInView();
    }
}

export default Crate;
