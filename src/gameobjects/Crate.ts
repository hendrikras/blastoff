import { Input, Physics, Math as PMath, Types, Scene } from 'phaser';
// import Player from './Player';
import Enemy from './Enemy';

class Crate extends Physics.Arcade.Sprite {
  private _player: boolean = false;
  private _enemy?: Enemy = null;
  get enemy(): Enemy {
    return this._enemy;
  };
  set enemy(value: Enemy) {
    this._enemy = value;
  }
  get player(): boolean{
    return this._player;
  }
  set player(value: boolean){
    this._player = value;
    
  }
   constructor(scene: Scene, x: number ,y: number) {        
       super(scene, x, y, "crate");
       scene.add.existing(this)
       scene.physics.add.existing(this)
   }    
}

export default Crate;