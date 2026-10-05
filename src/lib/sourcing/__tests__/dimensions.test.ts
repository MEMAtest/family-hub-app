import { labelledDimensions } from '../dimensions';
test('supplier-labelled dimensions and units are parsed without guessing', () => {
  expect(labelledDimensions('500mm wide, 864mm high, 25.5cm deep')).toEqual({ widthMm: 500, heightMm: 864, depthMm: 255 });
  expect(labelledDimensions('Width: 500mm; Depth 355mm')).toEqual({ widthMm: 500, depthMm: 355 });
  expect(labelledDimensions('500W x 864H x 355D mm')).toEqual({ widthMm: 500, heightMm: 864, depthMm: 355 });
  expect(labelledDimensions('1000mm towel rail for small bathroom')).toEqual({});
});
