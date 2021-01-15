/*
* This program and the accompanying materials are made available under the terms of the
* Eclipse Public License v2.0 which accompanies this distribution, and is available at
* https://www.eclipse.org/legal/epl-v20.html
*
* SPDX-License-Identifier: EPL-2.0
*
* Copyright Contributors to the Zowe Project.
*
*/

import { Writable } from "stream";
import * as zlib from "zlib";
import { ImperativeError } from "../../../error";
import { ContentEncodingType, Headers } from "./Headers";

export class CompressionUtils {
    /**
     * Decompress a buffer using zlib.
     * @param data Compressed buffer
     * @param encoding Value of Content-Encoding header
     * @throws {ImperativeError}
     */
    public static decompressBuffer(data: Buffer, encoding: ContentEncodingType): Buffer {
        if (!Headers.CONTENT_ENCODING_TYPES.includes(encoding)) {
            throw new ImperativeError({ msg: `Unsupported content encoding type ${encoding}` });
        }

        try {
            switch (encoding) {
                case "br":      return zlib.brotliDecompressSync(data);
                case "deflate": return zlib.inflateSync(data);
                case "gzip":    return zlib.gunzipSync(data);
            }
        } catch (err) {
            throw new ImperativeError({
                msg: `Failed to decompress response with content encoding type ${encoding}`,
                causeErrors: err
            });
        }
    }

    /**
     * Add zlib decompression transform to a Writable stream. Any compressed
     * data written to the returned stream will be decompressed.
     * @param stream Writable stream that will receive compressed data
     * @param encoding Value of Content-Encoding header
     * @throws {ImperativeError}
     */
    public static decompressStream(stream: Writable, encoding: ContentEncodingType): Writable {
        if (!Headers.CONTENT_ENCODING_TYPES.includes(encoding)) {
            throw new ImperativeError({ msg: `Unsupported content encoding type ${encoding}` });
        }

        const multipipe = require("multipipe");
        try {
            switch (encoding) {
                case "br":      return multipipe(zlib.createBrotliDecompress(), stream);
                case "deflate": return multipipe(zlib.createInflate(), stream);
                case "gzip":    return multipipe(zlib.createGunzip(), stream);
            }
        } catch (err) {
            throw new ImperativeError({
                msg: `Failed to decompress response with content encoding type ${encoding}`,
                causeErrors: err
            });
        }
    }
}
