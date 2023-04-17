import { Scene } from 'phaser';
import Vector2 = Phaser.Math.Vector2;

class Path {
private radius: number;
private points: Vector2[]
private scene: Scene;
  constructor(scene: Scene, radius: number, points: Vector2[]) {
    this.radius = radius;
    this.scene = scene;
    this.points = points ? points : [];
  }

  public addPoint(point: Vector2) {
    this.points.push(point);
  }

  public getPoints(): Vector2[] {
    return this.points;
  }

  update() {
   // get the graphics object
   const graphics = this.scene.add.graphics();
    // draw the path
    graphics.lineStyle(2, 0xffffff, 1);
    graphics.beginPath();
    graphics.moveTo(this.points[0].x, this.points[0].y);
    for (let i = 1; i < this.points.length; i++) {
      graphics.lineTo(this.points[i].x, this.points[i].y);
    }
    graphics.strokePath();
  }
}

export default Path;