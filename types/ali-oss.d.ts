/**
 * Type definitions for ali-oss
 * Since @types/ali-oss doesn't exist, we provide basic type definitions
 */

declare module 'ali-oss' {
  export interface PutObjectOptions {
    mime?: string;
    meta?: Record<string, string>;
    headers?: Record<string, string>;
    callback?: {
      url: string;
      host?: string;
      body?: string;
      bodyType?: string;
    };
  }

  export interface PutObjectResult {
    name: string;
    url: string;
    res: {
      status: number;
      statusCode: number;
      headers: Record<string, string>;
    };
  }

  export interface Options {
    accessKeyId: string;
    accessKeySecret: string;
    bucket: string;
    region: string;
    endpoint?: string;
    secure?: boolean;
    timeout?: number;
    internal?: boolean;
    cname?: boolean;
    [key: string]: any; // Allow other options
  }

  class OSS {
    constructor(options: Options);

    put(
      name: string,
      file: Buffer | string | Blob | File | ArrayBuffer,
      options?: PutObjectOptions
    ): Promise<PutObjectResult>;

    // Add other commonly used methods as needed
    get(name: string, file?: string): Promise<any>;
    delete(name: string): Promise<any>;
    list(options?: any): Promise<any>;
    head(name: string): Promise<any>;
    copy(name: string, sourceName: string, options?: any): Promise<any>;
    multipartUpload(name: string, file: any, options?: any): Promise<any>;
  }

  export default OSS;
}
