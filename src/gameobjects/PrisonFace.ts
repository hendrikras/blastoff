import {Constructor} from '../helpers';

export default <TBase extends Constructor>(Base: TBase) =>
    class extends Base {
        private drawFace(top, bottom, floorTop, floorBottom) {
            // this will draw a simple crate 'texture'
            // as phaser seems to have lost the ability to draw a texture on the graphics game object in 3.5x.
            // @ts-ignore
            const {graphics, vanishPoint, point, gridUnit} = this;
            const magicZ = (1000 - vanishPoint.distance(point)) / 1000 + 1;
            graphics.setDepth(magicZ);
            graphics.fillStyle(0xCCCCCC, 1);
            graphics.lineStyle(gridUnit / 4, 0x000, 1);
            const divide = 1 / 5;
            const topboard = top.clone().lerp(floorTop, divide).clone();
            const bottomboard = bottom.clone().lerp(floorBottom, divide).clone();
            const topfloorboard = floorTop.clone().lerp(top, divide).clone();
            const bottomfloorboard = floorBottom.clone().lerp(bottom, divide).clone();

            graphics.fillPoints([top, bottom, bottomboard, topboard], true);
            graphics.strokePath();

            graphics.fillPoints([topfloorboard, bottomfloorboard, floorBottom, floorTop], true);
            graphics.strokePath();

            // draw 7 semi transparant vertical wooden beams on the center of the crate
            let prevTop = topboard;
            let prevCorner = topfloorboard;
            const beams = 7;
            for (let i = 1; i <= beams; i++) {
                const lerp = i / beams;
                const topsideboard = topboard.clone().lerp(bottomboard, lerp).clone();
                const bottomsideboard = topfloorboard.clone().lerp(bottomfloorboard, lerp).clone();

                let alpha = 1;
                if (i === 4 || i === 6 || i === 2) {
                    alpha = 0;
                }
                graphics.fillStyle(0xCCCCCC, alpha);
                graphics.fillPoints([prevTop, prevCorner, bottomsideboard, topsideboard], true);
                graphics.strokePath();

                prevTop = topsideboard;
                prevCorner = bottomsideboard;
            }
        }
    };
