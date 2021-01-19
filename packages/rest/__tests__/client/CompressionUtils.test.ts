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

import { PassThrough } from "stream";
import * as zlib from "zlib";
import * as streamToString from "stream-to-string";
import { CompressionUtils } from "../../src/client/CompressionUtils";

const responseText = "Request failed successfully";
const rawBuffer = Buffer.from(responseText);
const brBuffer = zlib.brotliCompressSync(rawBuffer);
const deflateBuffer = zlib.deflateSync(rawBuffer);
const gzipBuffer = zlib.gzipSync(rawBuffer);

describe("CompressionUtils tests", () => {
    describe("decompressBuffer", () => {
        it("should decompress buffer using Brotli algorithm", () => {
            const result = CompressionUtils.decompressBuffer(brBuffer, "br").toString();
            expect(result).toBe(responseText);
        });

        it("should decompress buffer using deflate algorithm", () => {
            const result = CompressionUtils.decompressBuffer(deflateBuffer, "deflate").toString();
            expect(result).toBe(responseText);
        });

        it("should decompress buffer using gzip algorithm", () => {
            const result = CompressionUtils.decompressBuffer(gzipBuffer, "gzip").toString();
            expect(result).toBe(responseText);
        });

        it("should fail to decompress buffer using unknown algorithm", () => {
            let caughtError;
            try {
                CompressionUtils.decompressBuffer(rawBuffer, null as any);
            } catch (error) {
                caughtError = error;
            }
            expect(caughtError).toBeDefined();
            expect(caughtError.message).toContain("Unsupported content encoding type");
        });

        it("should fail to decompress buffer with invalid data", () => {
            let caughtError;
            try {
                CompressionUtils.decompressBuffer(brBuffer, "gzip");
            } catch (error) {
                caughtError = error;
            }
            expect(caughtError).toBeDefined();
            expect(caughtError.message).toContain("Failed to decompress response buffer");
        });
    });

    describe("decompressStream", () => {
        it("should decompress stream using Brotli algorithm", async () => {
            const responseStream = CompressionUtils.decompressStream(new PassThrough(), "br");
            responseStream.end(brBuffer);
            const result = await streamToString(responseStream);
            expect(result).toBe(responseText);
        });

        it("should decompress stream using deflate algorithm", async () => {
            const responseStream = CompressionUtils.decompressStream(new PassThrough(), "deflate");
            responseStream.end(deflateBuffer);
            const result = await streamToString(responseStream);
            expect(result).toBe(responseText);
        });

        it("should decompress stream using gzip algorithm", async () => {
            const responseStream = CompressionUtils.decompressStream(new PassThrough(), "gzip");
            responseStream.end(gzipBuffer);
            const result = await streamToString(responseStream);
            expect(result).toBe(responseText);
        });

        it("should fail to decompress stream using unknown algorithm", () => {
            let caughtError;
            try {
                CompressionUtils.decompressStream(new PassThrough(), null as any);
            } catch (error) {
                caughtError = error;
            }
            expect(caughtError).toBeDefined();
            expect(caughtError.message).toContain("Unsupported content encoding type");
        });

        it("should fail to decompress stream with invalid data", async () => {
            let caughtError;
            try {
                await new Promise((resolve, reject) => {
                    const responseStream = CompressionUtils.decompressStream(new PassThrough(), "gzip", reject);
                    responseStream.end(brBuffer);
                });
            } catch (error) {
                caughtError = error;
            }
            expect(caughtError).toBeDefined();
            expect(caughtError.message).toContain("Failed to decompress response stream");
        });
    });
});
