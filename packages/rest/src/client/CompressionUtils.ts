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

import { Duplex, Transform, Writable } from "stream";
import * as zlib from "zlib";
import { ImperativeError } from "../../../error";
import { IO } from "../../../io";
import { ContentEncoding, Headers } from "./Headers";

export class CompressionUtils {
    /**
     * Decompress a buffer using the specified algorithm.
     * @param data Compressed buffer
     * @param encoding Value of Content-Encoding header
     * @throws {ImperativeError}
     */
    public static decompressBuffer(data: Buffer, encoding: ContentEncoding): Buffer {
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
                msg: `Failed to decompress response buffer with content encoding type ${encoding}`,
                additionalDetails: err.message,
                causeErrors: err
            });
        }
    }

    /**
     * Add zlib decompression transform to a Writable stream. Any compressed
     * data written to the returned stream will be decompressed using the
     * specified algorithm.
     *
     * The returned stream should only be used internally by a REST client to
     * write to. Use the original stream to read back the decompressed output
     * and handle decompression errors.
     * @param responseStream Writable stream that will receive compressed data
     * @param encoding Value of Content-Encoding header
     * @param normalizeNewLines Specifies if line endings should be converted
     * @throws {ImperativeError}
     */
    public static decompressStream(responseStream: Writable, encoding: ContentEncoding, normalizeNewLines?: boolean): Duplex {
        if (!Headers.CONTENT_ENCODING_TYPES.includes(encoding)) {
            throw new ImperativeError({ msg: `Unsupported content encoding type ${encoding}` });
        }

        try {
            // First transform handles decompression
            const transforms = [this.zlibTransform(encoding)];

            // Second transform is optional and processes line endings
            if (normalizeNewLines) {
                const transformSnd = new Transform({
                    transform(chunk, _, callback) {
                        this.push(Buffer.from(IO.processNewlines(chunk.toString())));
                        callback();
                    }
                });
                transforms.push(transformSnd);
            }

            // Chain transforms and response stream together
            for (const [i, stream] of transforms.entries()) {
                const next = transforms[i + 1] || responseStream;
                stream.pipe(next);
                stream.on("error", (err) => responseStream.emit("error", err));
            }

            // Return first stream in chain
            return transforms[0];
        } catch (err) {
            throw new ImperativeError({
                msg: `Failed to decompress response stream with content encoding type ${encoding}`,
                additionalDetails: err.message,
                causeErrors: err
            });
        }
    }

    private static zlibTransform(encoding: ContentEncoding): Transform {
        switch (encoding) {
            case "br":      return zlib.createBrotliDecompress();
            case "deflate": return zlib.createInflate();
            case "gzip":    return zlib.createGunzip();
        }
    }
}
