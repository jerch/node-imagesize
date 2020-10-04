/**
 * Murmur3A hash algorithm.
 * 
 * Implemented from pseudocode of https://en.wikipedia.org/wiki/MurmurHash.
 * 
 * Note: Other than the original this variant operates on 32bit values
 * (no reminder hashing needed).
 */
export function murmur3A(data: Uint32Array, seed: number): number {
  let hash = seed | 0;
  for (let i = 0; i < data.length; ++i) {
    let k = data[i];
    k = (((0x2d51 * k) & 0xFFFFFFFF) + (((0xcc9e * k) & 0xFFFF) << 16)) | 0;
    k = (k << 15) | (k >>> 17);
    k = (((0x3593 * k) & 0xFFFFFFFF) + (((0x1b87 * k) & 0xFFFF) << 16)) | 0;
    hash ^= k;
    hash = (hash << 13) | (hash >>> 19);
    hash = (((hash * 5) & 0xFFFFFFFF) + 0xe6546b64) | 0;
  }
  hash ^= data.length * 4;
  hash ^= hash >>> 16;
  hash = (((0xca6b * hash) & 0xFFFFFFFF) + (((0x85eb * hash) & 0xFFFF) << 16)) | 0;
  hash ^= hash >>> 13;
  hash = (((0xae35 * hash) & 0xFFFFFFFF) + (((0xc2b2 * hash) & 0xFFFF) << 16)) | 0;
  hash ^= hash >>> 16;
  return hash >>> 0;
}
