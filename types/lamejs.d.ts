/**
 * Type definitions for @breezystack/lamejs
 * Fixed version of lamejs with MPEGMode support
 * https://github.com/zhuker/lamejs
 */

declare module '@breezystack/lamejs' {
  export class Mp3Encoder {
    constructor(channels: number, sampleRate: number, bitrate: number);
    encodeBuffer(left: Int16Array, right?: Int16Array): Int8Array;
    flush(): Int8Array;
  }
  
  export class MPEGMode {
    static STEREO: number;
    static JOINT_STEREO: number;
    static DUAL_CHANNEL: number;
    static MONO: number;
    static NOT_SET: number;
  }
}
