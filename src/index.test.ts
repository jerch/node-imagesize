import { assert } from 'chai';
import { ImageSize, ImageType } from '.';
import * as fs from 'fs';
import { Base64 } from './base64';


const TEST_IMAGES: [string, number, number][] = [
  ['w3c_home_256.gif', 72, 48],
  ['w3c_home_256.jpg', 72, 48],
  ['w3c_home_256.png', 72, 48],
  ['w3c_home_2.gif', 72, 48],
  ['w3c_home_2.jpg', 72, 48],
  ['w3c_home_2.png', 72, 48],
  ['w3c_home_animation.gif', 72, 48],
  ['w3c_home.gif', 72, 48],
  ['w3c_home_gray.gif', 72, 48],
  ['w3c_home_gray.jpg', 72, 48],
  ['w3c_home_gray.png', 72, 48],
  ['w3c_home.jpg', 72, 48],
  ['w3c_home.png', 72, 48],
  ['spinfox.png', 148, 148],
  ['iphone_hdr_YES.jpg', 3264, 2448],
  ['nikon-e950.jpg', 800, 600],
  ['agfa-makernotes.jpg', 8, 8],
  ['sony-alpha-6000.jpg', 6000, 4000]
]

const TYPE_MAP: {[index: string]: ImageType} = {
  gif: ImageType.GIF,
  png: ImageType.PNG,
  jpg: ImageType.JPEG
};


describe('ImageSize', () => {
  it('binary', () => {
    for (let i = 0; i < TEST_IMAGES.length; ++i) {
      const imageData = fs.readFileSync('./testimages/' + TEST_IMAGES[i][0]);
      assert.deepEqual(
        ImageSize.guessFromBytes(imageData),
        {width: TEST_IMAGES[i][1], height: TEST_IMAGES[i][2], type: TYPE_MAP[TEST_IMAGES[i][0].split('.')[1]]}
      );
    }
  });
  it('base64', () => {
    for (let i = 0; i < TEST_IMAGES.length; ++i) {
      const imageData = fs.readFileSync('./testimages/' + TEST_IMAGES[i][0]);
      const imageDataBase64 = new Uint8Array(Base64.encodeSize(imageData.length));
      Base64.encode(imageData, imageDataBase64);
      assert.deepEqual(
        ImageSize.guessFromBytes(imageDataBase64, true),
        {width: TEST_IMAGES[i][1], height: TEST_IMAGES[i][2], type: TYPE_MAP[TEST_IMAGES[i][0].split('.')[1]]}
      );
    }
  });
});
