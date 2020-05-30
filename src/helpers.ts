import {Physics, Types} from 'phaser';
import Crate from './gameobjects/Crate';
import ArcadeBodyBounds = Phaser.Types.Physics.Arcade.ArcadeBodyBounds;

type Direction = Types.Physics.Arcade.ArcadeBodyCollision;
export const getGameWidth = (scene: Phaser.Scene) => {
    return scene.game.scale.width;
  };

export const getGameHeight = (scene: Phaser.Scene) => {
    return scene.game.scale.height;
  };
export const collidesOnAxes = (crate: Crate, item: Crate, direction: Direction): boolean => {
  const axis = direction.up || direction.down ? 'x' : 'y';
  const opaxis = direction.up || direction.down ? 'y' : 'x';
  const halfSize = crate.body.height / 2;
  // the following var names are presuming direction in y axis. Could make it more general,
  // as this function is used on the x axis too. but this is already confusing as is.
  const leftCornerItem = item[axis] - halfSize;
  const rightCornerItem = item[axis] + halfSize;
  // reminder: change halfsize into halfwidth/ height if the item is not square.
  const leftCornerCrate = crate[axis] - halfSize;
  const rightCornerCrate = crate[axis] + halfSize;
  const upLeftCondition = item[opaxis] + halfSize <= crate[opaxis] - halfSize;
  const downRightCondition = item[opaxis] - halfSize >= crate[opaxis] + halfSize;
  return item !== crate
  && (direction.up || direction.left ? upLeftCondition : downRightCondition)
  && (
    (leftCornerItem <= rightCornerCrate && leftCornerItem >= leftCornerCrate )
    || (rightCornerItem <= rightCornerCrate && rightCornerItem >= leftCornerCrate )
  );
};
export const impassable = (crate: Crate, otherCrate: Crate, factor: number, direction: Direction, world: ArcadeBodyBounds): boolean => {
  if (crate.enemy) {
    return true;
  }
  const halfSize = crate.body.height / 2;
  const axis = direction.up || direction.down ? 'y' : 'x';
  const d2str = direction.left ? 'left' : direction.right ? 'right' : direction.up ? 'top' : direction.down ? 'bottom' : 'none';
  if (otherCrate) {
      const upLeftCondition = otherCrate[axis] + halfSize >= crate[axis] - halfSize - factor;
      const downRightCondition = otherCrate[axis]  - halfSize <= crate[axis] + halfSize + factor;
      return direction.up || direction.left ? upLeftCondition : downRightCondition;
  } else {
    const upleft = world[d2str] >= crate[axis] - halfSize;
    const downright = world[d2str] <= crate[axis] + halfSize;
    return direction.up || direction.left ? upleft : downright;
  }
 };
