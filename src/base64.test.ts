import { assert } from 'chai';
import { Base64, UintTypedArray } from './base64';


const TEST_STRINGS = [
  '',
  'h',
  'he',
  'hel',
  'hell',
  'hello',
  'hello ',
  'hello w',
  'hello wo',
  'hello wor',
  'hello worl',
  'hello world',
  'hello world!'
];


function bufToString(buf: UintTypedArray): string {
  return Array.from(buf).map(el => String.fromCharCode(el)).join('');
}

function getBase64Padding(buf: UintTypedArray): number {
  let padding = 0;
  if (buf[buf.length - 1] === '='.charCodeAt(0)) {
    padding++;
    if (buf[buf.length - 2] === '='.charCodeAt(0)) {
      padding++;
    }
  }
  return padding;
}

describe('base64 encode/decode', () => {
  it('should handle padding correctly - with padding', () => {
    let data = 'aaa';
    let buf1 = new Uint8Array(3000);
    let buf2 = new Uint8Array(3000);
    for (let i = 0; i < 1000; ++i) {
      // encode
      const encodedLength = Base64.encode(Buffer.from(data), buf1, data.length);
      assert.equal(Base64.encodeSize(data.length), encodedLength); // precalc size should match exactly
      assert.equal(bufToString(buf1.subarray(0, encodedLength)), Buffer.from(data).toString('base64'));
      // decode
      const decodedLength = Base64.decode(buf1, buf2, encodedLength);
      // subtract padding bytes so decodeSize is exact
      const paddingBytes = getBase64Padding(buf1.subarray(0, encodedLength));
      assert.equal(Base64.decodeSize(encodedLength - paddingBytes), decodedLength);
      assert.equal(bufToString(buf2.subarray(0, decodedLength)), data);
      data += 'a';
    }
  });
  it('should handle padding correctly - w\'o padding', () => {
    let data = 'aaa';
    let buf1 = new Uint8Array(3000);
    let buf2 = new Uint8Array(3000);
    for (let i = 0; i < 1000; ++i) {
      // encode
      // setting pad to false will omit the padding chars
      // we cannot test this against nodejs base64 as it always contains padding
      // pro of this - Base64.decodeSize can report exact length needed
      const encodedLength = Base64.encode(Buffer.from(data), buf1, data.length, false);
      // decode
      const decodedLength = Base64.decode(buf1, buf2, encodedLength);
      assert.equal(Base64.decodeSize(encodedLength), decodedLength);
      assert.equal(bufToString(buf2.subarray(0, decodedLength)), data);
      data += 'a';
    }
  });
  it('should encode all bytes correctly', () => {
    const data = Array.apply(0, Array(256)).map((_: any, id: number) => id);
    let buf1 = new Uint8Array(3000);
    let buf2 = new Uint8Array(3000);
    // encode
    const encodedLength = Base64.encode(Buffer.from(data), buf1, data.length);
    assert.equal(encodedLength, Buffer.from(data).toString('base64').length);
    assert.equal(bufToString(buf1.subarray(0, encodedLength)), Buffer.from(data).toString('base64'));
    // decode
    const decodedLength = Base64.decode(buf1, buf2, encodedLength);
    assert.equal(Base64.decodeSize(encodedLength) >= decodedLength, true);
    assert.equal(bufToString(buf2.subarray(0, decodedLength)), data.map((el: number) => String.fromCharCode(el)).join(''));
  });
  it('test strings', () => {
    let buf1 = new Uint8Array(3000);
    let buf2 = new Uint8Array(3000);
    for (let i = 0; i < TEST_STRINGS.length; ++i) {
      let data = TEST_STRINGS[i];
      // encode
      const encodedLength = Base64.encode(Buffer.from(data), buf1, data.length);
      assert.equal(encodedLength, Buffer.from(data).toString('base64').length);
      assert.equal(bufToString(buf1.subarray(0, encodedLength)), Buffer.from(data).toString('base64'));
      // decode
      const decodedLength = Base64.decode(buf1, buf2, encodedLength);
      assert.equal(Base64.decodeSize(encodedLength) >= decodedLength, true);
      assert.equal(bufToString(buf2.subarray(0, decodedLength)), data);
    }
  });
  it('strip invalid chars in decode', () => {
    // snippet contains 5 invalid chars
    const data = Buffer.from('YW5\n5IG Nhcm\x005hb\x07CBw\x80bGVhcw', 'binary');
    let buf = new Uint8Array(3000);
    const decodedLength = Base64.decode(data, buf, data.length);
    assert.equal(bufToString(buf.subarray(0, decodedLength)), bufToString(Buffer.from('YW5\n5IG Nhcm\x005hb\x07CBw\x80bGVhcw', 'base64')));
  });
});
