import { Physics, Math as PMath, Scene } from 'phaser';
import Enemy from './Enemy';
import {PerspectiveMixinType} from './PerspectiveMixin';
import {Direction} from '../helpers';
import Vector2 = Phaser.Math.Vector2;

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
       // @ts-ignore
       this.body.onWorldBounds = true;

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
