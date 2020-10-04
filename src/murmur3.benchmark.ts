import { ThroughputRuntimeCase, perfContext } from 'xterm-benchmark';
import { murmur3A } from './murmur3';


perfContext('murmur3A', () => {
  const d1 = new Uint32Array(256);
  const d16 = new Uint32Array(4096);
  const d256 = new Uint32Array(4096 * 16);
  const d4096 = new Uint32Array(4096 * 16 * 16);

  new ThroughputRuntimeCase('1 KB', () => {
    murmur3A(d1, 0);
    return {payloadSize: 1024};
  }, {repeat: 50}).showAverageThroughput();

  new ThroughputRuntimeCase('16 KB', () => {
    murmur3A(d16, 0);
    return {payloadSize: 4096 * 4};
  }, {repeat: 50}).showAverageThroughput();

  new ThroughputRuntimeCase('256 KB', () => {
    murmur3A(d256, 0);
    return {payloadSize: 4096 * 4 * 16};
  }, {repeat: 50}).showAverageThroughput();

  new ThroughputRuntimeCase('4096 KB', () => {
    murmur3A(d4096, 0);
    return {payloadSize: 4096 * 4 * 16 * 16};
  }, {repeat: 50}).showAverageThroughput();
});
