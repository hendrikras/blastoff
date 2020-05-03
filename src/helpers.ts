import * as Phaser from 'phaser';
import Crate from './gameobjects/Crate';

export const getGameWidth = (scene: Phaser.Scene) => {
    return scene.game.scale.width;
  };

export const getGameHeight = (scene: Phaser.Scene) => {
    return scene.game.scale.height;
  };
export const collidesOnAxes = (crate: Crate, item: Crate, direction: Phaser.Types.Physics.Arcade.ArcadeBodyCollision): boolean => {
  const axis = direction.up || direction.down ? 'x' : 'y';
  const opaxis = direction.up || direction.down ? 'y' : 'x';
  const halfSize = crate.body.height / 2;
  // the following var names are presuming direction in y axis. Could make it more general,
  // as this function is used on the x axis too. but this is already confusing as is.
  const leftCornerItem = item[axis] - halfSize;
  const rightCornerItem = item[axis] + halfSize;
  const leftCornerCrate = crate[axis] - halfSize;
  const rightCornerCrate = crate[axis] + halfSize;
  const upLeftCondition = item[opaxis] + halfSize <= crate[opaxis] - halfSize;
  const downRightCondition =item[opaxis] - halfSize >= crate[opaxis] + halfSize;
  return item !== crate 
  && (direction.up || direction.left ? upLeftCondition : downRightCondition)
  && (
    (leftCornerItem <= rightCornerCrate && leftCornerItem >= leftCornerCrate ) 
    || (rightCornerItem <= rightCornerCrate && rightCornerItem >= leftCornerCrate )
  );
};
export const impassable = (crate: Crate, otherCrate:Crate, factor: number, direction: Phaser.Types.Physics.Arcade.ArcadeBodyCollision): boolean => {  
  if (otherCrate){
    const halfSize = crate.body.height / 2;      
    const axis = direction.up || direction.down ? 'y' : 'x';    
  // otherCrate.setAlpha(0,0,0,1);
    const upLeftCondition = otherCrate[axis] +halfSize >= crate[axis] - halfSize - factor;
    const downRightCondition = otherCrate[axis]  - halfSize <= crate[axis] + halfSize + factor;
    if (direction.up || direction.left ? upLeftCondition: downRightCondition){      
      return true;
    };
  }
  return false;
 };