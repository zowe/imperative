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
import * as jsonfile from "jsonfile";
import * as lodash from "lodash";
import { ProfileInfo } from "../src/ProfileInfo";
import { ImperativeError } from "../..";
import { Config } from "../src/Config";
import { ProfLocType } from "../src/doc/IProfLoc";

const testAppNm = "ProfInfoApp";
const profileTypes = ["zosmf", "tso", "base"];

function createNewProfInfo(newDir: string): ProfileInfo {
    // create a new ProfileInfo in the desired directory
    process.chdir(newDir);
    return new ProfileInfo(testAppNm);
}

describe("ProfileInfo tests", () => {

    const tsoProfName = "tsoProfName";
    const tsoJsonLoc = "LPAR1." + tsoProfName;
    const testDir = path.join(__dirname,  "__resources__");
    const teamProjDir = path.join(testDir, testAppNm + "_team_config_proj");
    const homeDirPath = path.join(testDir, testAppNm + "_home");
    let origDir: string;

    beforeAll(() => {
        // remember our original directory
        origDir = process.cwd();

        // set our desired app home directory into the environment
        process.env[testAppNm.toUpperCase() + "_CLI_HOME"] = homeDirPath;
    });

    afterAll(() => {
        // ensure that jest reports go to the right place
        process.chdir(origDir);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("TeamConfig Tests", () => {
        describe("readProfilesFromDisk", () => {

            it("should throw exception if readProfilesFromDisk not called: TeamConfig", async () => {
                let impErr: ImperativeError;
                const profInfo = createNewProfInfo(teamProjDir);
                try {
                    profInfo.getDefaultProfile("zosmf");
                } catch (err) {
                    impErr = err;
                }
                expect(impErr.message).toContain(
                    "You must first call ProfileInfo.readProfilesFromDisk()."
                );
            });

            it("should successfully read a team config", async () => {
                const profInfo = createNewProfInfo(teamProjDir)
                await profInfo.readProfilesFromDisk();

                expect(profInfo.usingTeamConfig).toBe(true);
                const teamConfig: Config = profInfo.getTeamConfig();
                expect(teamConfig).not.toBeNull();
                expect(teamConfig.exists).toBe(true);

            });
        });

        describe("getDefaultProfile", () => {

            it("should return null if no default for that type exists: TeamConfig", async () => {
                const profInfo = createNewProfInfo(teamProjDir)
                await profInfo.readProfilesFromDisk();
                const profAttrs = profInfo.getDefaultProfile("ThisTypeDoesNotExist");
                expect(profAttrs).toBeNull();
            });

            it("should return a profile if one exists: TeamConfig", async () => {
                const profInfo = createNewProfInfo(teamProjDir)
                await profInfo.readProfilesFromDisk();
                const desiredProfType = "tso";
                const profAttrs = profInfo.getDefaultProfile(desiredProfType);

                expect(profAttrs).not.toBeNull();
                expect(profAttrs.isDefaultProfile).toBe(true);
                expect(profAttrs.profName).toBe(tsoProfName);
                expect(profAttrs.profType).toBe(desiredProfType);
                expect(profAttrs.profLoc.locType).not.toBeNull();

                const retrievedOsLoc = path.normalize(profAttrs.profLoc.osLoc[0]);
                const expectedOsLoc = path.join(teamProjDir, testAppNm + ".config.json");
                expect(retrievedOsLoc).toBe(expectedOsLoc);

                expect(profAttrs.profLoc.jsonLoc).toBe(tsoJsonLoc);
            });
        });

        describe("getAllProfiles", () => {
            it("should return all profiles if no type is specified: TeamConfig", async () => {
                const length = 5;
                const expectedDefaultProfiles = 3;
                const expectedDefaultProfileNameZosmf = "LPAR1";
                const expectedDefaultProfileNameTso = "LPAR1.tsoProfName";
                const expectedDefaultProfileNameBase = "base_glob";
                let actualDefaultProfiles = 0;
                let expectedProfileNames = ["LPAR1", "LPAR2", "LPAR3", "LPAR1.tsoProfName", "base_glob"];

                const profInfo = createNewProfInfo(teamProjDir);
                await profInfo.readProfilesFromDisk();
                const profAttrs = profInfo.getAllProfiles();

                expect(profAttrs.length).toEqual(length);
                for (const prof of profAttrs) {
                    if (prof.isDefaultProfile) {
                        let expectedName = "";
                        switch(prof.profType) {
                            case "zosmf": expectedName = expectedDefaultProfileNameZosmf; break;
                            case "tso": expectedName = expectedDefaultProfileNameTso; break;
                            case "base": expectedName = expectedDefaultProfileNameBase; break;
                        }
                        expect(prof.profName).toEqual(expectedName);
                        actualDefaultProfiles += 1;
                    }
                    expect(expectedProfileNames).toContain(prof.profName);
                    expect(profileTypes).toContain(prof.profType);
                    expect(prof.profLoc.locType).toEqual(ProfLocType.TEAM_CONFIG);
                    expect(prof.profLoc.osLoc).toBeDefined();
                    expect(prof.profLoc.osLoc.length).toEqual(1);
                    expect(prof.profLoc.osLoc[0]).toEqual(path.join(teamProjDir, testAppNm + ".config.json"));
                    expect(prof.profLoc.jsonLoc).toBeDefined();

                    const propertiesJson = jsonfile.readFileSync(path.join(teamProjDir, testAppNm + ".config.json"));
                    expect(lodash.get(propertiesJson, prof.profLoc.jsonLoc)).toBeDefined();

                    expectedProfileNames = expectedProfileNames.filter(obj => obj !== prof.profName);
                }
                expect(actualDefaultProfiles).toEqual(expectedDefaultProfiles);
                expect(expectedProfileNames.length).toEqual(0);
            });

            it("should return some profiles if a type is specified: TeamConfig", async () => {
                const length = 3;
                const desiredProfType = "zosmf";
                const expectedName = "LPAR1";
                const expectedDefaultProfiles = 1;
                let expectedProfileNames = ["LPAR1", "LPAR2", "LPAR3"];
                let actualDefaultProfiles = 0;

                const profInfo = createNewProfInfo(teamProjDir);
                await profInfo.readProfilesFromDisk();
                const profAttrs = profInfo.getAllProfiles(desiredProfType);

                expect(profAttrs.length).toEqual(length);
                for (const prof of profAttrs) {
                    if (prof.isDefaultProfile) {
                        expect(prof.profName).toEqual(expectedName);
                        actualDefaultProfiles += 1;
                    }
                    expect(expectedProfileNames).toContain(prof.profName);
                    expect(profileTypes).toContain(prof.profType);
                    expect(prof.profLoc.locType).toEqual(ProfLocType.TEAM_CONFIG);
                    expect(prof.profLoc.osLoc).toBeDefined();
                    expect(prof.profLoc.osLoc.length).toEqual(1);
                    expect(prof.profLoc.osLoc[0]).toEqual(path.join(teamProjDir, testAppNm + ".config.json"));
                    expect(prof.profLoc.jsonLoc).toBeDefined();

                    const propertiesJson = jsonfile.readFileSync(path.join(teamProjDir, testAppNm + ".config.json"));
                    expect(lodash.get(propertiesJson, prof.profLoc.jsonLoc)).toBeDefined();

                    expectedProfileNames = expectedProfileNames.filter(obj => obj !== prof.profName);
                }
                expect(actualDefaultProfiles).toEqual(expectedDefaultProfiles);
                expect(expectedProfileNames.length).toEqual(0);
            });
        });
    });

    describe("Old-school Profile Tests", () => {

        describe("getDefaultProfile", () => {

            it("should return null if no default for that type exists: oldSchool", async () => {
                const profInfo = createNewProfInfo(__dirname)
                await profInfo.readProfilesFromDisk();
                const profAttrs = profInfo.getDefaultProfile("ThisTypeDoesNotExist");
                expect(profAttrs).toBeNull();
            });

            it("should return a profile if one exists: oldSchool", async () => {
                const profInfo = createNewProfInfo(__dirname)
                await profInfo.readProfilesFromDisk();
                const desiredProfType = "tso";
                const profAttrs = profInfo.getDefaultProfile(desiredProfType);

                expect(profAttrs).not.toBeNull();
                expect(profAttrs.isDefaultProfile).toBe(true);
                expect(profAttrs.profName).toBe(tsoProfName);
                expect(profAttrs.profType).toBe(desiredProfType);
                expect(profAttrs.profLoc.locType).not.toBeNull();

                const retrievedOsLoc = path.normalize(profAttrs.profLoc.osLoc[0]);
                const expectedOsLoc = path.join(homeDirPath, "profiles",
                    desiredProfType, profAttrs.profName + ".yaml"
                );
                expect(retrievedOsLoc).toBe(expectedOsLoc);

                expect(profAttrs.profLoc.jsonLoc).toBeUndefined();
            });
        });

        describe("getAllProfiles", () => {
            it("should return all profiles if no type is specified: oldSchool", async () => {
                const length = 8;
                const expectedDefaultProfileNameZosmf = "lpar1_zosmf";
                const expectedDefaultProfileNameTso = "tsoProfName";
                const expectedDefaultProfileNameBase = "base_for_userNm";
                const expectedDefaultProfiles = 3;
                let expectedProfileNames = ["lpar1_zosmf", "lpar2_zosmf", "lpar3_zosmf", "lpar4_zosmf", "lpar5_zosmf", "tsoProfName",
                                              "base_for_userNm", "base_apiml"];
                let actualDefaultProfiles = 0;

                const profInfo = createNewProfInfo(homeDirPath);
                await profInfo.readProfilesFromDisk();
                const profAttrs = profInfo.getAllProfiles();

                expect(profAttrs.length).toEqual(length);
                for (const prof of profAttrs) {
                    if (prof.isDefaultProfile) {
                        let expectedName = "";
                        switch(prof.profType) {
                            case "zosmf": expectedName = expectedDefaultProfileNameZosmf; break;
                            case "tso": expectedName = expectedDefaultProfileNameTso; break;
                            case "base": expectedName = expectedDefaultProfileNameBase; break;
                        }
                        expect(prof.profName).toEqual(expectedName);
                        actualDefaultProfiles += 1;
                    }
                    expect(expectedProfileNames).toContain(prof.profName);
                    expect(profileTypes).toContain(prof.profType);
                    expect(prof.profLoc.locType).toEqual(ProfLocType.OLD_PROFILE);
                    expect(prof.profLoc.osLoc).toBeDefined();
                    expect(prof.profLoc.osLoc.length).toEqual(1);
                    expect(prof.profLoc.osLoc[0]).toEqual(path.join(homeDirPath, "profiles", prof.profType, prof.profName + ".yaml"));
                    expectedProfileNames = expectedProfileNames.filter(obj => obj !== prof.profName);
                }
                expect(actualDefaultProfiles).toEqual(expectedDefaultProfiles);
                expect(expectedProfileNames.length).toEqual(0);
            });

            it("should return some profiles if a type is specified: oldSchool", async () => {
                const length = 5;
                const expectedName = "lpar1_zosmf";
                const expectedDefaultProfiles = 1;
                const desiredProfType = "zosmf";
                let expectedProfileNames = ["lpar1_zosmf", "lpar2_zosmf", "lpar3_zosmf", "lpar4_zosmf", "lpar5_zosmf"];
                let actualDefaultProfiles = 0;

                const profInfo = createNewProfInfo(homeDirPath);
                await profInfo.readProfilesFromDisk();
                const profAttrs = profInfo.getAllProfiles(desiredProfType);

                expect(profAttrs.length).toEqual(length);
                for (const prof of profAttrs) {
                    if (prof.isDefaultProfile) {
                        expect(prof.profName).toEqual(expectedName);
                        actualDefaultProfiles += 1;
                    }
                    expect(expectedProfileNames).toContain(prof.profName);
                    expect(profileTypes).toContain(prof.profType);
                    expect(prof.profLoc.locType).toEqual(ProfLocType.OLD_PROFILE);
                    expect(prof.profLoc.osLoc).toBeDefined();
                    expect(prof.profLoc.osLoc.length).toEqual(1);
                    expect(prof.profLoc.osLoc[0]).toEqual(path.join(homeDirPath, "profiles", prof.profType, prof.profName + ".yaml"));
                    expectedProfileNames = expectedProfileNames.filter(obj => obj !== prof.profName);
                }
                expect(actualDefaultProfiles).toEqual(expectedDefaultProfiles);
                expect(expectedProfileNames.length).toEqual(0);
            });
        });
    });
});
