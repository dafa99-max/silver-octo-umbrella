
import type { AspectRatio } from './types';
import { SquareIcon, RectangleHorizontalIcon, RectangleVerticalIcon } from './components/Icon';

export const ASPECT_RATIOS: AspectRatio[] = [
  { name: '1:1', value: 1, icon: SquareIcon },
  { name: '4:3', value: 4 / 3, icon: RectangleHorizontalIcon },
  { name: '16:9', value: 16 / 9, icon: RectangleHorizontalIcon },
  { name: '3:4', value: 3 / 4, icon: RectangleVerticalIcon },
  { name: '9:16', value: 9 / 16, icon: RectangleVerticalIcon },
];

export const MAX_CANVAS_DIMENSION = 1024;
