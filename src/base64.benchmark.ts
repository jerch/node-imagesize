import { ThroughputRuntimeCase, perfContext } from 'xterm-benchmark';
import { Base64 } from '.';
import { fromByteArray, toByteArray } from 'base64-js';
import { encode, decode } from 'js-base64';


function toBytes(s: string): Uint8Array {
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; ++i) {
    bytes[i] = s.charCodeAt(i) & 0xFF;
  }
  return bytes;
}

const d1 = toBytes('ABCD'.repeat(256));
const d16 = toBytes('ABCD'.repeat(256 * 16));
const d256 = toBytes('ABCD'.repeat(256 * 16 * 16));
const d4096 = toBytes('ABCD'.repeat(256 * 16 * 16 * 16));



perfContext('Base64', () => {


  perfContext('Node - Buffer', () => {
    const encoded = Buffer.from(d4096.buffer).toString('base64');

    new ThroughputRuntimeCase('encode - 4096 KB', () => {
      Buffer.from(d4096.buffer).toString('base64');
      return { payloadSize: d4096.length };
    }, { repeat: 50 }).showAverageThroughput();

    new ThroughputRuntimeCase('decode - 4096 KB', () => {
      Buffer.from(encoded, 'base64');
      return { payloadSize: encoded.length };
    }, { repeat: 50 }).showAverageThroughput();
  });


  perfContext('base64-js', () => {
    const encoded = Buffer.from(d4096.buffer).toString('base64');

    new ThroughputRuntimeCase('encode - 4096 KB', () => {
      fromByteArray(d4096);
      return { payloadSize: d4096.length };
    }, { repeat: 50 }).showAverageThroughput();

    new ThroughputRuntimeCase('decode - 4096 KB', () => {
      toByteArray(encoded);
      return { payloadSize: encoded.length };
    }, { repeat: 50 }).showAverageThroughput();
  });


  perfContext('js-base64', () => {
    const s4096 = 'ABCD'.repeat(256 * 16 * 16 * 16);
    const encoded = Buffer.from(d4096.buffer).toString('base64');

    new ThroughputRuntimeCase('encode - 4096 KB', () => {
      encode(s4096);
      return { payloadSize: s4096.length };
    }, { repeat: 50 }).showAverageThroughput();

    new ThroughputRuntimeCase('decode - 4096 KB', () => {
      decode(encoded);
      return { payloadSize: encoded.length };
    }, { repeat: 50 }).showAverageThroughput();
  });


  perfContext('Base64.encode', () => {
    const t1 = new Uint8Array(Base64.encodeSize(d1.length));
    const t16 = new Uint8Array(Base64.encodeSize(d16.length));
    const t256 = new Uint8Array(Base64.encodeSize(d256.length));
    const t4096 = new Uint8Array(Base64.encodeSize(d4096.length));

    new ThroughputRuntimeCase('1 KB', () => {
      Base64.encode(d1, t1);
      return { payloadSize: d1.length };
    }, { repeat: 50 }).showAverageThroughput();

    new ThroughputRuntimeCase('16 KB', () => {
      Base64.encode(d16, t16);
      return { payloadSize: d16.length };
    }, { repeat: 50 }).showAverageThroughput();

    new ThroughputRuntimeCase('256 KB', () => {
      Base64.encode(d256, t256);
      return { payloadSize: d256.length };
    }, { repeat: 50 }).showAverageThroughput();

    new ThroughputRuntimeCase('4096 KB', () => {
      Base64.encode(d4096, t4096);
      return { payloadSize: d4096.length };
    }, { repeat: 50 }).showAverageThroughput();
  });


  perfContext('Base64.decode', () => {
    const t1 = new Uint8Array(Base64.encodeSize(d1.length));
    const l1 = Base64.encode(d1, t1);
    const o1 = new Uint8Array(d1.length);

    const t16 = new Uint8Array(Base64.encodeSize(d16.length));
    const l16 = Base64.encode(d16, t16);
    const o16 = new Uint8Array(d16.length);

    const t256 = new Uint8Array(Base64.encodeSize(d256.length));
    const l256 = Base64.encode(d256, t256);
    const o256 = new Uint8Array(d256.length);

    const t4096 = new Uint8Array(Base64.encodeSize(d4096.length));
    const l4096 = Base64.encode(d4096, t4096);
    const o4096 = new Uint8Array(d4096.length);

    new ThroughputRuntimeCase('1 KB', () => {
      Base64.decode(t1, o1, l1);
      return { payloadSize: t1.length };
    }, { repeat: 50 }).showAverageThroughput();

    new ThroughputRuntimeCase('16 KB', () => {
      Base64.decode(t16, o16, l16);
      return { payloadSize: t16.length };
    }, { repeat: 50 }).showAverageThroughput();

    new ThroughputRuntimeCase('256 KB', () => {
      Base64.decode(t256, o256, l256);
      return { payloadSize: t256.length };
    }, { repeat: 50 }).showAverageThroughput();

    new ThroughputRuntimeCase('4096 KB', () => {
      Base64.decode(t4096, o4096, l4096);
      return { payloadSize: t4096.length };
    }, { repeat: 50 }).showAverageThroughput();
  });
});
