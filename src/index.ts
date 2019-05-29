export type UintTypedArray = Uint8Array | Uint16Array | Uint32Array | Uint8ClampedArray;

// base64 maps
const BASE64_CHARMAP = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const ENC_MAP = new Uint8Array(BASE64_CHARMAP.split('').map(el => el.charCodeAt(0)));
const PAD = '='.charCodeAt(0);

// slow decoder map
const DEC_MAP = new Uint8Array(256);
DEC_MAP.fill(255);
for (let i = 0; i < ENC_MAP.length; ++i) {
  DEC_MAP[ENC_MAP[i]] = i;
}

function initDecodeMap(map: Uint32Array, shift: number): void {
  map.fill(3 << 24);
  for (let i = 0; i < ENC_MAP.length; ++i) {
    map[ENC_MAP[i]] = i << shift;
  }
}

// fast decoder maps
const DEC0 = new Uint32Array(256);
const DEC1 = new Uint32Array(256);
const DEC2 = new Uint32Array(256);
const DEC3 = new Uint32Array(256);
initDecodeMap(DEC0, 18);
initDecodeMap(DEC1, 12);
initDecodeMap(DEC2, 6);
initDecodeMap(DEC3, 0);


interface IPositionUpdate {
  sourcePos: number;
  targetPos: number;
}


export class Base64 {
  /**
   * Calculate needed encode space.
   */
  public static encodeSize(length: number): number {
    return Math.ceil(length / 3) * 4;
  }

  /**
   * Calculate needed decode space.
   * Returns an upper estimation if the encoded data contains padding
   * or invalid bytes (exact number if cleaned up).
   */
  public static decodeSize(length: number): number {
    return Math.ceil(length / 4) * 3 - (Math.ceil(length / 4) * 4 - length);
  }

  /**
   * Encode base64.
   * Returns number of encoded bytes written to `target`.
   */
  public static encode(data: UintTypedArray, target: UintTypedArray, length: number = data.length, pad: boolean = true): number {
    if (!length) {
      return 0;
    }
    if (target.length < Base64.encodeSize(length)) {
      throw new Error('not enough room to encode base64 data');
    }
    const padding = length % 3;
    if (padding) {
      length -= padding;
    }
    let j = 0;
    for (let i = 0; i < length; i += 3) {
      // load 3x 8 bit values
      let accu = data[i] << 16 | data[i + 1] << 8 | data[i + 2];

      // write 4x 6 bit values
      target[j++] = ENC_MAP[accu >> 18];
      target[j++] = ENC_MAP[(accu >> 12) & 0x3F];
      target[j++] = ENC_MAP[(accu >> 6) & 0x3F];
      target[j++] = ENC_MAP[accu & 0x3F];
    }
    if (padding) {
      if (padding === 2) {
        let accu = (data[length] << 8) | data[length + 1];
        accu <<= 2;
        target[j++] = ENC_MAP[accu >> 12];
        target[j++] = ENC_MAP[(accu >> 6) & 0x3F];
        target[j++] = ENC_MAP[accu & 0x3F];
        if (pad) {
          target[j++] = PAD;
        }
      } else {
        let accu = data[length];
        accu <<= 4;
        target[j++] = ENC_MAP[accu >> 6];
        target[j++] = ENC_MAP[accu & 0x3F];
        if (pad) {
          target[j++] = PAD;
          target[j++] = PAD;
        }
      }
    }
    return j;
  }

  // slow bytewise decoder, handles invalid and final chunks
  public static decodeChunk(
    source: UintTypedArray,
    target: UintTypedArray,
    endPos: number,
    sourcePos: number,
    targetPos: number): IPositionUpdate
  {
    let count = 0;
    let d = 0;
    let accu = 0;
    do {
      if ((d = DEC_MAP[source[sourcePos]]) !== 0xFF) {
        count++;
        accu <<= 6;
        accu |= d;
        // save fixed chunk, return fixed positions to fast decoder
        if (!(count & 3)) {
          target[targetPos++] = accu >> 16;
          target[targetPos++] = (accu >> 8) & 0xFF;
          target[targetPos++] = accu & 0xFF;
          return {sourcePos: sourcePos - 3, targetPos};
        }
      } else {
        // TODO: error rules based on base64 type
      }
    } while (++sourcePos < endPos);

    // handle final chunk
    switch (count & 3) {
      case 2:
        target[targetPos++] = accu >> 4;
        break;
      case 3:
        accu >>= 2;
        target[targetPos++] = accu >> 8;
        target[targetPos++] = accu & 0xFF;
        break;
    }
    
    return {sourcePos, targetPos};
  }

  /**
   * Decode base64.
   * Returns number of decoded bytes written to `target`.
   */
  public static decode(source: UintTypedArray, target: UintTypedArray, length: number = source.length): number {
    if (!length) {
      return 0;
    }
    let endPos = length;
    while (DEC_MAP[source[endPos - 1]] === 0xFF && endPos--) {}
    let targetPos = 0;
    let accu = 0;
    let sourcePos = 0;
    let fourStop = (endPos >> 2) << 2;  // FIXME: should be endPos - 4????? possible error in test?

    // fast loop on four bytes
    do {
      accu = DEC0[source[sourcePos]] | DEC1[source[sourcePos + 1]] | DEC2[source[sourcePos + 2]] | DEC3[source[sourcePos + 3]];
      if (accu & 0xFF000000) {
        // handle invalid chunk in slow decoder and fix positions
        const fix = Base64.decodeChunk(source, target, endPos, sourcePos, targetPos);
        sourcePos = fix.sourcePos;
        targetPos = fix.targetPos;
      } else {
        target[targetPos++] = accu >> 16;
        target[targetPos++] = (accu >> 8) & 0xFF;
        target[targetPos++] = accu & 0xFF;
      }
      sourcePos += 4;
    } while (sourcePos < fourStop);

    // handle last chunk in slow decoder
    return Base64.decodeChunk(source, target, endPos, sourcePos, targetPos).targetPos;
  }
}


/**
 * Supported image types.
 * INVALID is set if the data does not pass the header checks,
 * either being to short or containing invalid bytes.
 */
export const enum ImageType {
  JPEG = 0,
  PNG = 1,
  GIF = 2,
  INVALID = 255
}

/**
 * Returned by ImageSize functions.
 * If the dimensions could not be determined height/width are set to -1.
 * If the header checks fail type is set to INVALID.
 * PNG and GIF have a fixed sized header thus -1 in width/height means that the data
 * did not pass the header checks.
 * JPEG might pass the header checks (type set to JPEG) and still report no width/height,
 * if the SOFx frame was not found within the provided data.
 */
export interface ISize {
  width: number;
  height: number;
  type: ImageType;
}

/**
 * Functions to get the image size from binary image data.
 * The functions support peeking into base64 encoded data.
 */
export class ImageSize {
  // header buffer to hold PNG and GIF header from base64
  static headerBuffer = new Uint8Array(24);
  public static fromJPEG(data: UintTypedArray, base64: boolean = false): ISize {
    const result: ISize = {width: -1, height: -1, type: ImageType.INVALID};

    if (base64) {
      let i = 0;
      // JPEG starts with "/9j/" in base64
      if (data[i] !== 0x2F || data[i + 1] !== 0x39 || data[i + 2] !== 0x6A || data[i + 3] !== 0x2F) {
        return result;
      }
      // FIXME: currently decodes all data since the loop below relies on seeing all data
      const buffer = new Uint8Array(Base64.decodeSize(data.length));
      const decodedLength = Base64.decode(data, buffer);
      data = buffer.subarray(0, decodedLength);
    }

    const length = data.length;
    if (length < 10) {
      return result;
    }
    let i = 0;
    // JPEG should always start with 0xFFD8 followed by 0xFFE0 (JFIF) or 0xFFE1 (Exif)
    if (data[i] !== 0xFF || data[i + 1] !== 0xD8 || data[i + 2] !== 0xFF || (data[i + 3] !== 0xE0 && data[i + 3] !== 0xE1)) {
      return result;
    }
    i += 4;
    // should have either "JFIF" or "Exif" following
    if ((data[i + 2] !== 0x4a || data[i + 3] !== 0x46 || data[i + 4] !== 0x49 || data[i + 5] !== 0x46 || data[i + 6] !== 0x00)
      && (data[i + 2] !== 0x45 || data[i + 3] !== 0x78 || data[i + 4] !== 0x69 || data[i + 5] !== 0x66 || data[i + 6] !== 0x00)) {
        return result;
      }
    // walk the blocks and search for SOFx marker
    let blockLength = (data[i] << 8) | data[i + 1];
    while (true) {
      i += blockLength;
      if(i >= length) {
        // exhausted
        result.type = ImageType.JPEG;
        return result;
      }
      if(data[i] !== 0xFF) {
        return result;
      }
      if(data[i + 1] === 0xC0 || data[i + 1] === 0xC2) {
        if (i + 8 < length) {
          result.width = (data[i + 7] << 8) | data[i + 8];
          result.height = (data[i + 5] << 8) | data[i + 6];
          result.type = ImageType.JPEG;
          return result;
        } else {
          return result;
        }
      } else {
        i += 2;
        blockLength = (data[i] << 8) | data[i + 1];
      }
    }
  }

  public static fromPNG(data: UintTypedArray, base64: boolean = false): ISize {
    const result: ISize = {width: -1, height: -1, type: ImageType.INVALID};

    if (base64) {
      if (data.length < 32) {
        return result;
      }
      let i = 0;
      // PNG starts with "iVBORw0K" in base64
      // check for "iVBO" (first 3 bytes)
      if (data[i] !== 0x69 || data[i + 1] !== 0x56 || data[i + 2] !== 0x42 || data[i + 3] !== 0x4F) {
        return result;
      }
      // decode 32 bytes --> 24 bytes needed to get size
      const decodedLength = Base64.decode(data, ImageSize.headerBuffer, 32);
      if (decodedLength !== 24) {
        return result;
      }
      data = ImageSize.headerBuffer;
    }

    if (data.length < 24) {
      return result;
    }
    let i = 0;
    // header check 89 50 4E 47 0D 0A 1A 0A
    if (data[i] !== 0x89 || data[i + 1] !== 0x50 || data[i + 2] !== 0x4E || data[i + 3] !== 0x47
        || data[i + 4] !== 0x0D || data[i + 5] !== 0x0A || data[i + 6] !== 0x1A || data[i + 7] !== 0x0A) {
      return result;
    }
    i += 12;
    // first chunk must be IHDR
    if (data[i] !== 'I'.charCodeAt(0)
      || data[i + 1] !== 'H'.charCodeAt(0)
      || data[i + 2] !== 'D'.charCodeAt(0)
      || data[i + 3] !== 'R'.charCodeAt(0)) {
        return result;
    }
    i += 4;
    // next 8 byte contain width/height in big endian
    result.width = data[i] << 24 | data[i + 1] << 16 | data[i + 2] << 8 | data[i + 3];
    result.height = data[i + 4] << 24 | data[i + 5] << 16 | data[i + 6] << 8 | data[i + 7];
    result.type = ImageType.PNG;
    return result;
  }

  public static fromGIF(data: UintTypedArray, base64: boolean = false): ISize {
    const result: ISize = {width: -1, height: -1, type: ImageType.INVALID};

    if (base64) {
      if (data.length < 16) {
        return result;
      }
      let i = 0;
      // GIF starts with "R0lG" in base64
      if (data[i] !== 0x52 || data[i + 1] !== 0x30 || data[i + 2] !== 0x6C || data[i + 3] !== 0x47) {
        return result;
      }
      // decode 16 bytes --> 12 (10 bytes needed to get size)
      const decodedLength = Base64.decode(data, ImageSize.headerBuffer, 16);
      if (decodedLength !== 12) {
        return result;
      }
      data = ImageSize.headerBuffer;
    }

    const length = data.length;
    if (length < 10) {
      return result;
    }
    let i = 0;
    // header starts with "GIF"
    if (data[i] !== 0x47 || data[i + 1] !== 0x49 || data[i + 2] !== 0x46) {
        return result;
    }
    i += 3;
    // 3 bytes "87a" or "89a" following
    if (data[i] !== 0x38 || (data[i + 1] !== 0x37 && data[i + 1] !== 0x39) || data[i + 2] !== 0x61) {
        return result;
    }
    i += 3;
    // next 4 bytes contain width/heigt in little endian
    result.width = (data[i + 1] << 8) | data[i];
    result.height = (data[i + 3] << 8) | data[i + 2];
    result.type = ImageType.GIF;
    return result;
  }

  public static guessFormat(data: UintTypedArray, base64: boolean = false): ISize {
    if (base64) {
      switch (data[0]) {
        case 0x2F:  // '/'
          return ImageSize.fromJPEG(data, base64);
        case 0x69:  // 'i'
          return ImageSize.fromPNG(data, base64);
        case 0x52:  // 'R'
          return ImageSize.fromGIF(data, base64);
        default:
          return {width: -1, height: -1, type: ImageType.INVALID};
      }
    } else {
      switch (data[0]) {
        case 0xFF:
          return ImageSize.fromJPEG(data, base64);
        case 0x89:
          return ImageSize.fromPNG(data, base64);
        case 0x47:  // 'G'
          return ImageSize.fromGIF(data, base64);
        default:
          return {width: -1, height: -1, type: ImageType.INVALID};
      }
    }
  }
}
