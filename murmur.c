/**
 * @file murmur.c
 * @brief Small C helper to test murmur3A hash library.
 * @date 2020-10-04
 * 
 * Code taken from Wikipedia example and extended to a small cmdline tool
 * to create murmur3A hashes from STDIN. Hashing is done in blocks of 4096 bytes.
 * 
 * Compile: gcc murmur.c -o murmur3A
 * Usage:   echo -en "\x00..." | ./murmur3A
 *          cat bin_file | ./murmur3A
 */
#include <stdint.h>
#include <stddef.h>
#include <stdio.h>
#include <string.h>
#include <unistd.h>

static inline uint32_t murmur_32_scramble(uint32_t k) {
    k *= 0xcc9e2d51;
    k = (k << 15) | (k >> 17);
    k *= 0x1b873593;
    return k;
}
uint32_t murmur3_32(const uint8_t* key, size_t len, uint32_t seed)
{
	uint32_t h = seed;
    uint32_t k;
    /* Read in groups of 4. */
    for (size_t i = len >> 2; i; i--) {
        // Here is a source of differing results across endiannesses.
        // A swap here has no effects on hash properties though.
        memcpy(&k, key, sizeof(uint32_t));
        key += sizeof(uint32_t);
        h ^= murmur_32_scramble(k);
        h = (h << 13) | (h >> 19);
        h = h * 5 + 0xe6546b64;
    }
    /* Read the rest. */
    k = 0;
    for (size_t i = len & 3; i; i--) {
        k <<= 8;
        k |= key[i - 1];
    }
    // A swap is *not* necessary here because the preceding loop already
    // places the low bytes in the low places according to whatever endianness
    // we use. Swaps only apply when the memory is copied in a chunk.
    h ^= murmur_32_scramble(k);
    /* Finalize. */
	h ^= len;
	h ^= h >> 16;
	h *= 0x85ebca6b;
	h ^= h >> 13;
	h *= 0xc2b2ae35;
	h ^= h >> 16;
	return h;
}


int main(void) {
  char c;
  size_t idx = 0;
  uint32_t seed = 0;
  uint8_t buffer[4096];

  while (1) {
    int res = read(0, &c, 1);
    if (res < 1) break;
    buffer[idx++] = c;
    if (idx >= 4096) {
      seed = murmur3_32(buffer, idx, seed);
      idx = 0;
    }
  }
  if (idx) {
    seed = murmur3_32(buffer, idx, seed);
  }
  printf("%u\n", seed);
  return 0;
}
