import { assert } from 'chai';
import { spawn } from 'child_process';
import { murmur3A } from './murmur3';

function toBytes(s: string): Uint8Array {
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; ++i) {
    bytes[i] = s.charCodeAt(i) & 0xFF;
  }
  return bytes;
}

function toBytes32(s: string): Uint32Array {
  return new Uint32Array(toBytes(s).buffer);
}

function murmur(data: string) {
  const bytes32 = toBytes32(data);
  let seed = 0;
  // c side operates in blocks of 4096 bytes
  // thus we should do too to get same value
  for (let i = 0; i < bytes32.length; i += 1024) {
    seed = murmur3A(bytes32.subarray(i, i + 1024), seed);
  }
  return seed >>> 0;
}

function getCHash(data: string | Uint8Array): Promise<number> {
  return new Promise(res => {
    const p = spawn('./murmur3A', {stdio: ['pipe', 'pipe', 'pipe']});
    p.stdin.end(data instanceof Uint8Array ? data : Buffer.from(data, 'binary'));
    p.stdout.on('data', chunk => {
      res(+(chunk.slice(0, -1)));
    });
  });
}

const TESTDATA = [
  '1234',
  'ABCD',
  '12345678',
  'ABCDEFGH12345678',
  '\x00\xFF\x7F\x80',
  '\x00\x00\x00\x00\xFF\xFF\xFF\xFF',
  '\x00\xFF\x00\xFF\x00\xFF\x00\xFF',
  '\xcc\x9e\x2d\x51',
  '\x1b\x87\x35\x93',
  '\xe6\x54\x6b\x64',
  '\x85\xeb\xca\x6b',
  '\xc2\xb2\xae\x35'
];

describe('murmur3A', () => {
  it('basic tests', async () => {
    for (const rep of [1, 2, 100, 513]) {
      for (const d of TESTDATA) {
        assert.equal(murmur(d.repeat(rep)), await getCHash(d.repeat(rep)), `wrong hash for "${d.repeat(rep)}"`);
      }
    }
  });
  it('4 byte 0 .. 0x100', async function() {
    this.timeout(-1);
    const DATA = new Uint32Array(1);
    const DATA8 = new Uint8Array(DATA.buffer);

    for (let i = 0; i <= 0x100; i += 32) {
      const jResult: number[] = [];
      const cResult: Promise<number>[] = [];
      for (let j = i; j < i + 32; ++j) {
        DATA[0] = j;
        jResult.push(murmur3A(DATA, 0));
        cResult.push(getCHash(DATA8));
      }
      assert.deepEqual(jResult, await Promise.all(cResult), `${i}`);
    }
  });
  it('4 byte 0xFF00 .. 0x10000', async function() {
    this.timeout(-1);
    const DATA = new Uint32Array(1);
    const DATA8 = new Uint8Array(DATA.buffer);

    for (let i = 0xFF00; i <= 0x10000; i += 32) {
      const jResult: number[] = [];
      const cResult: Promise<number>[] = [];
      for (let j = i; j < i + 32; ++j) {
        DATA[0] = j;
        jResult.push(murmur3A(DATA, 0));
        cResult.push(getCHash(DATA8));
      }
      assert.deepEqual(jResult, await Promise.all(cResult), `${i}`);
    }
  });
  it('4 byte 0xFFFFFF00 .. 0xFFFFFFFF', async function() {
    this.timeout(-1);
    const DATA = new Uint32Array(1);
    const DATA8 = new Uint8Array(DATA.buffer);

    for (let i = 0xFFFFFF00; i < 0xFFFFFFFF; i += 32) {
      const jResult: number[] = [];
      const cResult: Promise<number>[] = [];
      for (let j = i; j < i + 32; ++j) {
        DATA[0] = j;
        jResult.push(murmur3A(DATA, 0));
        cResult.push(getCHash(DATA8));
      }
      assert.deepEqual(jResult, await Promise.all(cResult), `${i}`);
    }
  });
});
