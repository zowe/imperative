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
import { ProfLocType } from "../src/doc/IProfLoc";
import { IProfileSchema } from "../../profiles";

const testAppNm = "ProfInfoApp";

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

        describe("mergeArgsForProfile", () => {
            const profSchema: Partial<IProfileSchema> = {
                properties: {
                    host: { type: "string" },
                    username: {
                        type: "string",
                        optionDefinition: { defaultValue: "admin" }
                    } as any,
                    password: {
                        type: "string",
                        optionDefinition: { defaultValue: "admin" }
                    } as any
                }
            };

            const requiredProfSchema: Partial<IProfileSchema> = {
                properties: {
                    ...profSchema.properties,
                    protocol: { type: "string" }
                },
                required: [ "protocol" ]
            };

            it("should find known args in simple service profile: TeamConfig", async () => {
                const profInfo = createNewProfInfo(teamProjDir);
                await profInfo.readProfilesFromDisk();
                const profAttrs = profInfo.getDefaultProfile("zosmf");
                const mergedArgs = profInfo.mergeArgsForProfile(profAttrs);

                const expectedArgs = [
                    { argName: "host", dataType: "string" },
                    { argName: "port", dataType: "number" },
                    { argName: "responseFormatHeader", dataType: "boolean" }
                ];

                expect(mergedArgs.knownArgs.length).toBe(expectedArgs.length);
                for (const [idx, arg] of mergedArgs.knownArgs.entries()) {
                    expect(arg).toMatchObject(expectedArgs[idx]);
                    expect(arg.argValue).toBeDefined();
                    expect(arg.argLoc.locType).toBe(ProfLocType.TEAM_CONFIG);
                    expect(arg.argLoc.jsonLoc).toMatch(/^profiles\.LPAR1\.properties\./);
                    expect(arg.argLoc.osLoc[0]).toMatch(new RegExp(`${testAppNm}\\.config\\.json$`));
                }
            });

            it("should find known args in nested service profile: TeamConfig", async () => {
                const profInfo = createNewProfInfo(teamProjDir);
                await profInfo.readProfilesFromDisk();
                const profAttrs = profInfo.getDefaultProfile("tso");
                const mergedArgs = profInfo.mergeArgsForProfile(profAttrs);

                const expectedArgs = [
                    { argName: "host", dataType: "string" },
                    { argName: "port", dataType: "number" },
                    { argName: "responseFormatHeader", dataType: "boolean" },
                    { argName: "account", dataType: "string" },
                    { argName: "characterSet", dataType: "string" },
                    { argName: "codePage", dataType: "string" },
                    { argName: "columns", dataType: "number" },
                    { argName: "logonProcedure", dataType: "string" },
                    { argName: "regionSize", dataType: "number" },
                    { argName: "rows", dataType: "number" }
                ];

                expect(mergedArgs.knownArgs.length).toBe(expectedArgs.length);
                for (const [idx, arg] of mergedArgs.knownArgs.entries()) {
                    expect(arg).toMatchObject(expectedArgs[idx]);
                    expect(arg.argValue).toBeDefined();
                    expect(arg.argLoc.locType).toBe(ProfLocType.TEAM_CONFIG);
                    expect(arg.argLoc.jsonLoc).toMatch(/^profiles\.LPAR1\.(profiles|properties)\./);
                    expect(arg.argLoc.osLoc[0]).toMatch(new RegExp(`${testAppNm}\\.config\\.json$`));
                }
            });

            it("should find known args in service and base profile: TeamConfig", async () => {
                const profInfo = createNewProfInfo(teamProjDir);
                await profInfo.readProfilesFromDisk();
                (profInfo as any).mLoadedConfig.api.profiles.defaultSet("base", "base_glob");
                const profAttrs = profInfo.getDefaultProfile("zosmf");
                const mergedArgs = profInfo.mergeArgsForProfile(profAttrs);

                const expectedArgs = [
                    { argName: "host", dataType: "string" },
                    { argName: "port", dataType: "number" },
                    { argName: "responseFormatHeader", dataType: "boolean" },
                    { argName: "user", dataType: "string" },
                    { argName: "password", dataType: "string" },
                    { argName: "rejectUnauthorized", dataType: "boolean" }
                ];

                expect(mergedArgs.knownArgs.length).toBe(expectedArgs.length);
                for (const [idx, arg] of mergedArgs.knownArgs.entries()) {
                    expect(arg).toMatchObject(expectedArgs[idx]);
                    expect(arg.argValue).toBeDefined();
                    expect(arg.argLoc.locType).toBe(ProfLocType.TEAM_CONFIG);
                    expect(arg.argLoc.jsonLoc).toMatch(/^profiles\.(base_glob|LPAR1)\.properties\./);
                    expect(arg.argLoc.osLoc[0]).toMatch(new RegExp(`${testAppNm}\\.config\\.json$`));
                }
            });

            it("should find known args defined with kebab case names: TeamConfig", async () => {
                const fakeBasePath = "api/v1";
                const profInfo = createNewProfInfo(teamProjDir);
                await profInfo.readProfilesFromDisk();
                (profInfo as any).mLoadedConfig.set("profiles.LPAR1.properties.base-path", fakeBasePath);
                const profAttrs = profInfo.getDefaultProfile("zosmf");
                const mergedArgs = profInfo.mergeArgsForProfile(profAttrs);

                const expectedArgs = [
                    { argName: "host", dataType: "string" },
                    { argName: "port", dataType: "number" },
                    { argName: "responseFormatHeader", dataType: "boolean" },
                    { argName: "basePath", dataType: "string", argValue: fakeBasePath }
                ];

                expect(mergedArgs.knownArgs.length).toBe(expectedArgs.length);
                for (const [idx, arg] of mergedArgs.knownArgs.entries()) {
                    expect(arg).toMatchObject(expectedArgs[idx]);
                    expect(arg.argValue).toBeDefined();
                    expect(arg.argLoc.locType).toBe(ProfLocType.TEAM_CONFIG);
                    expect(arg.argLoc.jsonLoc).toMatch(/^profiles\.LPAR1\.properties\./);
                    expect(arg.argLoc.osLoc[0]).toMatch(new RegExp(`${testAppNm}\\.config\\.json$`));
                }
            });

            it("should list optional args missing in service profile: TeamConfig", async () => {
                const profInfo = createNewProfInfo(teamProjDir);
                await profInfo.readProfilesFromDisk();
                const profAttrs = profInfo.getDefaultProfile("zosmf");
                jest.spyOn(profInfo as any, "loadSchema").mockReturnValue(profSchema);
                const mergedArgs = profInfo.mergeArgsForProfile(profAttrs);

                const expectedArgs = [
                    { argName: "username", dataType: "string", argValue: "admin" },
                    { argName: "password", dataType: "string", argValue: "admin" }
                ];

                expect(mergedArgs.missingArgs.length).toBe(expectedArgs.length);
                for (const [idx, arg] of mergedArgs.missingArgs.entries()) {
                    expect(arg).toMatchObject(expectedArgs[idx]);
                    expect(arg.argLoc.locType).toBe(ProfLocType.TEAM_CONFIG);
                    expect(arg.argLoc.jsonLoc).toBeUndefined();
                    expect(arg.argLoc.osLoc).toBeUndefined();
                }
            });

            it("should throw if there are required args missing in service profile: TeamConfig", async () => {
                const profInfo = createNewProfInfo(teamProjDir);
                await profInfo.readProfilesFromDisk();
                const profAttrs = profInfo.getDefaultProfile("zosmf");
                jest.spyOn(profInfo as any, "loadSchema").mockReturnValue(requiredProfSchema);

                let caughtError;
                try {
                    profInfo.mergeArgsForProfile(profAttrs);
                } catch (error) {
                    caughtError = error;
                }

                expect(caughtError).toBeDefined();
                expect(caughtError.message).toContain("Missing required properties: protocol");
            });
        });

        describe("mergeArgsForProfileType", () => {
            it("should find known args in base profile: TeamConfig", async () => {
                const profInfo = createNewProfInfo(teamProjDir);
                await profInfo.readProfilesFromDisk();
                (profInfo as any).mLoadedConfig.api.profiles.defaultSet("base", "base_glob");
                const mergedArgs = profInfo.mergeArgsForProfileType("cics");

                const expectedArgs = [
                    { argName: "user", dataType: "string" },
                    { argName: "password", dataType: "string" },
                    { argName: "rejectUnauthorized", dataType: "boolean" }
                ];

                expect(mergedArgs.knownArgs.length).toBe(expectedArgs.length);
                for (const [idx, arg] of mergedArgs.knownArgs.entries()) {
                    expect(arg).toMatchObject(expectedArgs[idx]);
                    expect(arg.argValue).toBeDefined();
                    expect(arg.argLoc.locType).toBe(ProfLocType.TEAM_CONFIG);
                    expect(arg.argLoc.jsonLoc).toMatch(/^profiles\.base_glob\.properties\./);
                    expect(arg.argLoc.osLoc[0]).toMatch(new RegExp(`${testAppNm}\\.config\\.json$`));
                }
            });
        });

        describe("getAllProfiles", () => {
            it("should return all profiles if no type is specified: TeamConfig", () => {
                // Add tests
                expect(true).toBe(true);
            });

            it("should return some profiles if a type is specified: TeamConfig", () => {
                // Add tests
                expect(true).toBe(true);
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
    });
});
