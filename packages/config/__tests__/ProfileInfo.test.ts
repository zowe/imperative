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

import * as path from "path";
import { ProfileInfo } from "../src/ProfileInfo";
import { ImperativeError } from "../..";
import { Config } from "../src/Config";

describe("ProfileInfo tests", () => {

    const configAppNm = "ProfInfoApp";
    const tsoProfName = "tsoProfName";
    const tsoJsonLoc = "LPAR1." + tsoProfName;
    const configDirNm = __dirname + "/__resources__";
    const expectedOsLoc = path.normalize(
        configDirNm + "/" + configAppNm + ".config.json"
    );
    let profInfo: ProfileInfo;
    let origDir: string;

    beforeAll(() => {
        // go to the directory with our team config file
        origDir = process.cwd();
        process.chdir(__dirname + "/__resources__");
    });

    afterAll(() => {
        // ensure that jest reports go to the right place
        process.chdir(origDir);
    });

    beforeEach(() => {
        profInfo = new ProfileInfo();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("readProfilesFromDisk", () => {

        it("should cause getDefaultProfile to throw exception if not called", async () => {
            let impErr: ImperativeError;
            try {
                profInfo.getDefaultProfile("zosmf");
            } catch (err) {
                impErr = err;
            }
            expect(impErr.message).toContain("You must first call ProfileInfo.readProfilesFromDisk().");

        });

        it("should successfully read a team config", async () => {
            await profInfo.readProfilesFromDisk(configAppNm);
            expect(profInfo.usingTeamConfig).toBe(true);
            const teamConfig: Config = profInfo.getTeamConfig();
            expect(teamConfig).not.toBeNull();
            expect(teamConfig.exists).toBe(true);

        });
    });

    describe("getDefaultProfile", () => {

        it("should return null if no default for that type exists", async () => {
            await profInfo.readProfilesFromDisk(configAppNm);
            const profAttrs = profInfo.getDefaultProfile("ThisTypeDoesNotExist");
            expect(profAttrs).toBeNull();

        });

        it("should return a profile if one exists", async () => {
            await profInfo.readProfilesFromDisk(configAppNm);
            const desiredProfType = "tso";
            const profAttrs = profInfo.getDefaultProfile(desiredProfType);

            expect(profAttrs).not.toBeNull();
            expect(profAttrs.isDefaultProfile).toBe(true);
            expect(profAttrs.profName).toBe(tsoProfName);
            expect(profAttrs.profType).toBe(desiredProfType);
            expect(profAttrs.profLoc.locType).not.toBeNull();

            const retrievedOsLoc = path.normalize(profAttrs.profLoc.osLoc);
            expect(retrievedOsLoc).toBe(expectedOsLoc);

            expect(profAttrs.profLoc.jsonLoc).toBe(tsoJsonLoc);
        });
    });
});
