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

import * as jsonfile from "jsonfile";
import * as npmPackageArg from "npm-package-arg";
import * as pacote from "pacote";
import { getPackageInfo } from "../../../src/plugins/utilities/NpmFunctions";
import { PMFConstants } from "../../../src/plugins/utilities/PMFConstants";

jest.mock("jsonfile");
jest.mock("pacote");

describe("NpmFunctions", () => {

    describe("getPackageInfo", () => {
        const expectedInfo = { name: "@zowe/imperative", version: "latest" };

        beforeAll(() => {
            jest.spyOn(jsonfile, "readFileSync").mockResolvedValue(expectedInfo);
            jest.spyOn(pacote, "manifest").mockResolvedValue(expectedInfo as any);
        });

        afterEach(() => {
            jest.clearAllMocks();
        });

        afterAll(() => {
            jest.restoreAllMocks();
        })

        it("should fetch info for package installed from registry", async () => {
            const pkgSpec = "@zowe/imperative";
            expect(npmPackageArg(pkgSpec).type).toEqual("tag");

            jest.spyOn(PMFConstants, "instance", "get").mockReturnValueOnce({
                PLUGIN_HOME_LOCATION: ""
            } as any);
            const actualInfo = await getPackageInfo(pkgSpec);
            expect(actualInfo).toBe(expectedInfo);
            expect(jsonfile.readFileSync).toHaveBeenCalledTimes(1);
        });

        it("should fetch info for package installed from local directory", async () => {
            const pkgSpec = "./imperative";
            expect(npmPackageArg(pkgSpec).type).toEqual("directory");

            const actualInfo = await getPackageInfo(pkgSpec);
            expect(actualInfo).toBe(expectedInfo);
            expect(pacote.manifest).toHaveBeenCalledTimes(1);
        });

        it("should fetch info for package installed from local TGZ", async () => {
            const pkgSpec = "imperative.tgz";
            expect(npmPackageArg(pkgSpec).type).toEqual("file");

            const actualInfo = await getPackageInfo(pkgSpec);
            expect(actualInfo).toBe(expectedInfo);
            expect(pacote.manifest).toHaveBeenCalledTimes(1);
        });

        it("should fetch info for package installed from Git URL", async () => {
            const pkgSpec = "github:zowe/imperative";
            expect(npmPackageArg(pkgSpec).type).toEqual("git");

            const actualInfo = await getPackageInfo(pkgSpec);
            expect(actualInfo).toBe(expectedInfo);
            expect(pacote.manifest).toHaveBeenCalledTimes(1);
        });

        it("should fetch info for package installed from remote TGZ", async () => {
            const pkgSpec = "http://example.com/zowe/imperative.tgz";
            expect(npmPackageArg(pkgSpec).type).toEqual("remote");

            const actualInfo = await getPackageInfo(pkgSpec);
            expect(actualInfo).toBe(expectedInfo);
            expect(pacote.manifest).toHaveBeenCalledTimes(1);
        });
    });
});
