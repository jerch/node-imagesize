import { Base64 } from './base64';


export type UintTypedArray = Uint8Array | Uint16Array | Uint32Array | Uint8ClampedArray;

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
    let blockLength = data[i] << 8 | data[i + 1];
    while (true) {
      i += blockLength;
      if(i >= length) {
        // exhausted without size info
        result.type = ImageType.JPEG;
        return result;
      }
      if(data[i] !== 0xFF) {
        return result;
      }
      if(data[i + 1] === 0xC0 || data[i + 1] === 0xC2) {
        if (i + 8 < length) {
          result.width = data[i + 7] << 8 | data[i + 8];
          result.height = data[i + 5] << 8 | data[i + 6];
          result.type = ImageType.JPEG;
          return result;
        } else {
          return result;
        }
      } else {
        i += 2;
        blockLength = data[i] << 8 | data[i + 1];
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
      // check for "iVBO" (first 4 bytes)
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
    if (data[i] !== 0x49
      || data[i + 1] !== 0x48
      || data[i + 2] !== 0x44
      || data[i + 3] !== 0x52) {
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
    result.width = data[i + 1] << 8 | data[i];
    result.height = data[i + 3] << 8 | data[i + 2];
    result.type = ImageType.GIF;
    return result;
  }

  public static guessFromBytes(data: UintTypedArray, base64: boolean = false): ISize {
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

  public static guess(data: UintTypedArray | string, base64: boolean = false): ISize {
    // TODO ...
    return {width: -1, height: -1, type: ImageType.INVALID};
  }
}
