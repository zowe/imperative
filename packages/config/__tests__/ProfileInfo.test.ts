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
import { IProfOpts } from "../src/doc/IProfOpts";
import { ProfInfoErr } from "../src/ProfInfoErr";
import { Config } from "../src/Config";
import { IConfigOpts } from "../src/doc/IConfigOpts";
import { ProfLocType } from "../src/doc/IProfLoc";
import { IProfileSchema, ProfileIO } from "../../profiles";

const testAppNm = "ProfInfoApp";
const testEnvPrefix = testAppNm.toUpperCase();
const profileTypes = ["zosmf", "tso", "base", "dummy"];

function createNewProfInfo(newDir: string, opts?: IProfOpts): ProfileInfo {
    // create a new ProfileInfo in the desired directory
    process.chdir(newDir);
    const profInfo = new ProfileInfo(testAppNm, opts);
    jest.spyOn((profInfo as any).mCredentials, "isSecured", "get").mockReturnValue(false);
    return profInfo;
}

describe("ProfileInfo tests", () => {

    const tsoName = "tsoProfName";
    const tsoProfName = "LPAR1.tsoProfName"
    const tsoJsonLoc = "profiles.LPAR1.profiles." + tsoName;
    const testDir = path.join(__dirname,  "__resources__");
    const teamProjDir = path.join(testDir, testAppNm + "_team_config_proj");
    const homeDirPath = path.join(testDir, testAppNm + "_home");
    const homeDirPathTwo = path.join(testDir, testAppNm + "_home_two");
    const homeDirPathThree = path.join(testDir, testAppNm + "_home_three");
    const four = 4;
    let origDir: string;

    const envHost = testEnvPrefix + "_OPT_HOST";
    const envPort = testEnvPrefix + "_OPT_PORT";
    const envRFH = testEnvPrefix + "_OPT_RESPONSE_FORMAT_HEADER";
    const envArray = testEnvPrefix + "_OPT_LIST";

    beforeAll(() => {
        // remember our original directory
        origDir = process.cwd();
    });

    beforeEach(() => {
        // set our desired app home directory into the environment
        process.env[testEnvPrefix + "_CLI_HOME"] = homeDirPath;
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
                let caughtErr: ProfInfoErr;
                const profInfo = createNewProfInfo(teamProjDir);
                try {
                    profInfo.getDefaultProfile("zosmf");
                } catch (err) {
                    expect(err instanceof ProfInfoErr).toBe(true);
                    caughtErr = err;
                }
                expect(caughtErr.errorCode).toBe(ProfInfoErr.MUST_READ_FROM_DISK);
                expect(caughtErr.message).toContain(
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

            it("should successfully read a team config from a starting directory", async () => {
                // ensure that we are not in the team project directory
                const profInfo = createNewProfInfo(origDir);

                const teamCfgOpts:IConfigOpts = { projectDir: teamProjDir };
                await profInfo.readProfilesFromDisk(teamCfgOpts);

                expect(profInfo.usingTeamConfig).toBe(true);
                const teamConfig: Config = profInfo.getTeamConfig();
                expect(teamConfig).not.toBeNull();
                expect(teamConfig.exists).toBe(true);
            });
        });

        describe("getDefaultProfile", () => {

            it("should return null if no default for that type exists: TeamConfig", async () => {
                const profInfo = createNewProfInfo(teamProjDir);
                await profInfo.readProfilesFromDisk();
                const profAttrs = profInfo.getDefaultProfile("ThisTypeDoesNotExist");
                expect(profAttrs).toBeNull();
            });

            it("should return a profile if one exists: TeamConfig", async () => {
                const profInfo = createNewProfInfo(teamProjDir);
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
                const length = 7;
                const expectedDefaultProfiles = 4;
                const expectedDefaultProfileNameZosmf = "LPAR1";
                const expectedDefaultProfileNameTso = "LPAR1.tsoProfName";
                const expectedDefaultProfileNameBase = "base_glob";
                const expectedDefaultProfileNameDummy = "LPAR4";
                let actualDefaultProfiles = 0;
                let expectedProfileNames = ["LPAR1", "LPAR2", "LPAR3", "LPAR1.tsoProfName", "LPAR1.tsoProfName.tsoSubProfName", "base_glob", "LPAR4"];

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
                            case "dummy": expectedName = expectedDefaultProfileNameDummy; break;
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

        describe("mergeArgsForProfile", () => {
            afterEach(() => {
                delete process.env[envHost];
                delete process.env[envPort];
                delete process.env[envRFH];
                delete process.env[envArray];
            });

            const profSchema: Partial<IProfileSchema> = {
                properties: {
                    host: { type: "string" },
                    user: {
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
                delete profInfo.getTeamConfig().layerActive().properties.defaults.base;
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
                delete profInfo.getTeamConfig().layerActive().properties.defaults.base;
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
                    expect(arg.secure || arg.argValue).toBeDefined();
                    expect(arg.argLoc.locType).toBe(ProfLocType.TEAM_CONFIG);
                    expect(arg.argLoc.jsonLoc).toMatch(/^profiles\.(base_glob|LPAR1)\.properties\./);
                    expect(arg.argLoc.osLoc[0]).toMatch(new RegExp(`${testAppNm}\\.config\\.json$`));
                }
            });

            it("should override not known args in service and base profile with environment variables: TeamConfig", async () => {
                const fakePort = 12345;
                const teamConfigHost = "LPAR4.your.domain.net";
                const teamConfigPort = 234;
                process.env[envHost] = envHost; // already in known arguments
                process.env[envPort] = "" + fakePort; // arlready in known arguments
                process.env[envRFH] = "false";
                process.env[envArray] = "val1 'val 2' 'val \\' 3'"; // ["val1", "val 2", "val ' 3"]

                const profInfo = createNewProfInfo(teamProjDir, {overrideWithEnv: true});
                await profInfo.readProfilesFromDisk();
                const profAttrs = profInfo.getDefaultProfile("dummy");
                delete profInfo.getTeamConfig().layerActive().properties.defaults.base;
                const mergedArgs = profInfo.mergeArgsForProfile(profAttrs);

                const expectedArgs = [
                    { argName: "host", dataType: "string" }, // Not updated ; Already in known arguments
                    { argName: "responseFormatHeader", dataType: "boolean" }, // Not Updated - Not found in schema provided && not in `missingArgs`
                    { argName: "port", dataType: "number" }, // Updated ; Property in missingArgs with default Value
                    { argName: "list", dataType: "array" } // Added/Updated - Property in missing arguments
                ];
                const expectedValues = [teamConfigHost, true, fakePort, ["val1", "val 2", "val ' 3"]];

                expect(mergedArgs.knownArgs.length).toBe(expectedArgs.length);
                for (const [idx, arg] of mergedArgs.knownArgs.entries()) {
                    expect(arg).toMatchObject(expectedArgs[idx]);
                    if (arg.dataType === "array") {
                        expect((arg.argValue as string[]).sort()).toEqual((expectedValues[idx] as string[]).sort());
                        expect(arg.argLoc.locType).toBe(ProfLocType.ENV);
                    } else if (arg.argName === "port") {
                        expect(arg.argValue).toEqual(expectedValues[idx]);
                        expect(arg.argLoc.locType).toBe(ProfLocType.ENV);
                    } else {
                        expect(arg.argValue).toEqual(expectedValues[idx]);
                        expect(arg.argLoc.locType).toBe(ProfLocType.TEAM_CONFIG);
                    }
                }

                const expectedMissingArgs = [
                    { argName: "user", dataType: "string" },
                    { argName: "password", dataType: "string" },
                    { argName: "rejectUnauthorized", dataType: "boolean", argValue: true }
                ]
                expect(mergedArgs.missingArgs.length).toBe(expectedMissingArgs.length);
                for (const [idx, arg] of mergedArgs.missingArgs.entries()) {
                    expect(arg).toMatchObject(expectedMissingArgs[idx]);
                }
            });

            it("should find known args defined with kebab case names: TeamConfig", async () => {
                const fakeBasePath = "api/v1";
                const profInfo = createNewProfInfo(teamProjDir);
                await profInfo.readProfilesFromDisk();
                profInfo.getTeamConfig().set("profiles.LPAR1.properties.base-path", fakeBasePath);
                const profAttrs = profInfo.getDefaultProfile("zosmf");
                delete profInfo.getTeamConfig().layerActive().properties.defaults.base;
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

            it("should throw if property location cannot be found in JSON: TeamConfig", async () => {
                const profInfo = createNewProfInfo(teamProjDir);
                await profInfo.readProfilesFromDisk();
                let caughtError;

                try {
                    (profInfo as any).argTeamConfigLoc("doesNotExist", "fake");
                } catch (error) {
                    expect(error instanceof ProfInfoErr).toBe(true);
                    caughtError = error;
                }

                expect(caughtError).toBeDefined();
                expect(caughtError.errorCode).toBe(ProfInfoErr.PROP_NOT_IN_PROFILE);
                expect(caughtError.message).toContain("Failed to find property fake in the profile doesNotExist");
            });

            it("should list optional args missing in service profile: TeamConfig", async () => {
                const profInfo = createNewProfInfo(teamProjDir);
                await profInfo.readProfilesFromDisk();
                const profAttrs = profInfo.getDefaultProfile("zosmf");
                delete profInfo.getTeamConfig().layerActive().properties.defaults.base;
                jest.spyOn(profInfo as any, "loadSchema").mockReturnValueOnce(profSchema);
                const mergedArgs = profInfo.mergeArgsForProfile(profAttrs);

                const expectedArgs = [
                    { argName: "user", dataType: "string", argValue: "admin" },
                    { argName: "password", dataType: "string", argValue: "admin" }
                ];

                expect(mergedArgs.missingArgs.length).toBe(expectedArgs.length);
                for (const [idx, arg] of mergedArgs.missingArgs.entries()) {
                    expect(arg).toMatchObject(expectedArgs[idx]);
                    expect(arg.argLoc.locType).toBe(ProfLocType.DEFAULT);
                    expect(arg.argLoc.jsonLoc).toBeUndefined();
                    expect(arg.argLoc.osLoc).toBeUndefined();
                }
            });

            it("should throw if there are required args missing in service profile: TeamConfig", async () => {
                const profInfo = createNewProfInfo(teamProjDir);
                await profInfo.readProfilesFromDisk();
                const profAttrs = profInfo.getDefaultProfile("zosmf");
                jest.spyOn(profInfo as any, "loadSchema").mockReturnValueOnce(requiredProfSchema);
                let caughtError;

                try {
                    profInfo.mergeArgsForProfile(profAttrs);
                } catch (error) {
                    expect(error instanceof ProfInfoErr).toBe(true);
                    caughtError = error;
                }

                expect(caughtError).toBeDefined();
                expect(caughtError.errorCode).toBe(ProfInfoErr.MISSING_REQ_PROP);
                expect(caughtError.message).toContain("Missing required properties: protocol");
            });

            it("should validate profile for missing args when schema exists: TeamConfig", async () => {
                const profInfo = createNewProfInfo(teamProjDir);
                await profInfo.readProfilesFromDisk();
                const profAttrs = profInfo.getDefaultProfile("zosmf");
                delete profInfo.getTeamConfig().layerActive().properties.defaults.base;
                const mergedArgs = profInfo.mergeArgsForProfile(profAttrs);

                const expectedArgs = [
                    { argName: "user", dataType: "string" },
                    { argName: "password", dataType: "string" },
                    { argName: "rejectUnauthorized", dataType: "boolean", argValue: true },
                    { argName: "basePath", dataType: "string" },
                    { argName: "protocol", dataType: "string", argValue: "https" },
                    { argName: "encoding", dataType: "number" },
                    { argName: "responseTimeout", dataType: "number" }
                ];

                expect(mergedArgs.missingArgs.length).toBe(expectedArgs.length);
                for (const [idx, arg] of mergedArgs.missingArgs.entries()) {
                    expect(arg).toMatchObject(expectedArgs[idx]);
                    expect(arg.argLoc.locType).toBe(ProfLocType.DEFAULT);
                    expect(arg.argLoc.jsonLoc).toBeUndefined();
                    expect(arg.argLoc.osLoc).toBeUndefined();
                }
            });

            it("should throw if schema fails to load: TeamConfig", async () => {
                const profInfo = createNewProfInfo(teamProjDir);
                await profInfo.readProfilesFromDisk();
                const profAttrs = profInfo.getDefaultProfile("zosmf");
                jest.spyOn(profInfo as any, "loadSchema").mockReturnValueOnce(null);
                let caughtError;

                try {
                    profInfo.mergeArgsForProfile(profAttrs);
                } catch (error) {
                    expect(error instanceof ProfInfoErr).toBe(true);
                    caughtError = error;
                }

                expect(caughtError).toBeDefined();
                expect(caughtError.errorCode).toBe(ProfInfoErr.LOAD_SCHEMA_FAILED);
                expect(caughtError.message).toContain("Failed to load schema for profile type zosmf");
            });
        });

        describe("mergeArgsForProfileType", () => {
            it("should find known args in base profile: TeamConfig", async () => {
                const profInfo = createNewProfInfo(teamProjDir);
                await profInfo.readProfilesFromDisk();
                profInfo.getTeamConfig().api.profiles.defaultSet("base", "base_glob");
                jest.spyOn(profInfo as any, "loadSchema").mockReturnValueOnce({});
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

            it("should find missing args when schema is found: TeamConfig", async () => {
                const profInfo = createNewProfInfo(teamProjDir);
                await profInfo.readProfilesFromDisk();
                const mergedArgs = profInfo.mergeArgsForProfileType("ssh");

                const expectedArgs = [
                    { argName: "host", dataType: "string" },
                    { argName: "port", dataType: "number", argValue: 22 },
                    { argName: "privateKey", dataType: "string" },
                    { argName: "keyPassphrase", dataType: "string" },
                    { argName: "handshakeTimeout", dataType: "number" }
                ];

                expect(mergedArgs.missingArgs.length).toBe(expectedArgs.length);
                for (const [idx, arg] of mergedArgs.missingArgs.entries()) {
                    expect(arg).toMatchObject(expectedArgs[idx]);
                    expect(arg.argLoc.locType).toBe(ProfLocType.DEFAULT);
                }
            });
        });

        describe("loadAllSchemas", () => {
            it("should throw when schema property references a web URL: TeamConfig", async () => {
                const profInfo = createNewProfInfo(teamProjDir);
                await profInfo.readProfilesFromDisk();
                profInfo.getTeamConfig().layerActive().properties.$schema = "http://example.com/schema";
                let caughtError;

                try {
                    (profInfo as any).loadAllSchemas();
                } catch (error) {
                    expect(error instanceof ProfInfoErr).toBe(true);
                    caughtError = error;
                }

                expect(caughtError).toBeDefined();
                expect(caughtError.errorCode).toBe(ProfInfoErr.CANT_GET_SCHEMA_URL);
                expect(caughtError.message).toContain("Failed to load schema for config file");
                expect(caughtError.message).toContain("web URLs are not supported by ProfileInfo API");
            });

            it("should throw when schema file is invalid: TeamConfig", async () => {
                const profInfo = createNewProfInfo(teamProjDir);
                await profInfo.readProfilesFromDisk();
                jest.spyOn(jsonfile, "readFileSync").mockImplementationOnce(() => {
                    throw new Error("bad schema")
                });
                let caughtError;

                try {
                    (profInfo as any).loadAllSchemas();
                } catch (error) {
                    expect(error instanceof ProfInfoErr).toBe(true);
                    caughtError = error;
                }

                expect(caughtError).toBeDefined();
                expect(caughtError.errorCode).toBe(ProfInfoErr.LOAD_SCHEMA_FAILED);
                expect(caughtError.message).toContain("Failed to load schema for config file");
                expect(caughtError.message).toContain("invalid schema file");
            });
        });
    });

    describe("Old-school Profile Tests", () => {

        describe("getDefaultProfile", () => {

            afterEach(() => {
                jest.clearAllMocks();
            })

            it("should return null if no default for that type exists 1: oldSchool", async () => {
                const profInfo = createNewProfInfo(homeDirPath);
                const warnSpy = jest.spyOn((profInfo as any).mImpLogger, "warn");
                await profInfo.readProfilesFromDisk();
                const profAttrs = profInfo.getDefaultProfile("ThisTypeDoesNotExist");
                expect(profAttrs).toBeNull();
                expect(warnSpy).toHaveBeenCalledTimes(1);
                expect(warnSpy).toHaveBeenCalledWith("Found no old-school profile for type 'ThisTypeDoesNotExist'.");
            });

            it("should return null if no default for that type exists 2: oldSchool", async () => {
                process.env[testEnvPrefix + "_CLI_HOME"] = homeDirPathTwo;
                const profInfo = createNewProfInfo(homeDirPathTwo);
                const warnSpy = jest.spyOn((profInfo as any).mImpLogger, "warn");
                await profInfo.readProfilesFromDisk();
                const profAttrs = profInfo.getDefaultProfile("zosmf");
                expect(profAttrs).toBeNull();
                expect(warnSpy).toHaveBeenCalledTimes(four);
                expect(warnSpy).toHaveBeenLastCalledWith("Found no default old-school profiles.");
            });

            it("should return null if no default for that type exists 3: oldSchool", async () => {
                process.env[testEnvPrefix + "_CLI_HOME"] = homeDirPathThree;
                const profInfo = createNewProfInfo(homeDirPathThree);
                const warnSpy = jest.spyOn((profInfo as any).mImpLogger, "warn");
                await profInfo.readProfilesFromDisk();
                const profAttrs = profInfo.getDefaultProfile("zosmf");
                expect(profAttrs).toBeNull();
                expect(warnSpy).toHaveBeenCalledTimes(four);
                expect(warnSpy).toHaveBeenLastCalledWith("Found no old-school profiles.");
            });

            it("should return a profile if one exists: oldSchool", async () => {
                const profInfo = createNewProfInfo(homeDirPath)
                await profInfo.readProfilesFromDisk();
                const desiredProfType = "tso";
                const profAttrs = profInfo.getDefaultProfile(desiredProfType);

                expect(profAttrs).not.toBeNull();
                expect(profAttrs.isDefaultProfile).toBe(true);
                expect(profAttrs.profName).toBe(tsoName);
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

        describe("mergeArgsForProfile", () => {
            const profSchema: Partial<IProfileSchema> = {
                properties: {
                    host: { type: "string" },
                    user: {
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

            it("should find known args in simple service profile: oldSchool", async () => {
                const profInfo = createNewProfInfo(homeDirPath);
                await profInfo.readProfilesFromDisk();
                const profAttrs = profInfo.getDefaultProfile("zosmf");
                delete (profInfo as any).mOldSchoolProfileDefaults.base;
                const mergedArgs = profInfo.mergeArgsForProfile(profAttrs);

                const expectedArgs = [
                    { argName: "host", dataType: "string" },
                    { argName: "port", dataType: "number" },
                    { argName: "user", dataType: "string" },
                    { argName: "password", dataType: "string" },
                    { argName: "rejectUnauthorized", dataType: "boolean" }
                ];

                expect(mergedArgs.knownArgs.length).toBe(expectedArgs.length);
                for (const [idx, arg] of mergedArgs.knownArgs.entries()) {
                    expect(arg).toMatchObject(expectedArgs[idx]);
                    expect(arg.secure || arg.argValue).toBeDefined();
                    expect(arg.argLoc.locType).toBe(ProfLocType.OLD_PROFILE);
                    expect(arg.argLoc.osLoc[0]).toMatch(/lpar1_zosmf\.yaml$/);
                }
            });

            it("should find known args in service and base profile: oldSchool", async () => {
                const profInfo = createNewProfInfo(homeDirPath);
                await profInfo.readProfilesFromDisk();
                const profAttrs = profInfo.getDefaultProfile("zosmf");
                (profInfo as any).mOldSchoolProfileDefaults.base = "base_apiml";
                const mergedArgs = profInfo.mergeArgsForProfile(profAttrs);

                const expectedArgs = [
                    { argName: "host", dataType: "string" },
                    { argName: "port", dataType: "number" },
                    { argName: "user", dataType: "string" },
                    { argName: "password", dataType: "string" },
                    { argName: "rejectUnauthorized", dataType: "boolean" },
                    { argName: "tokenType", dataType: "string" },
                    { argName: "tokenValue", dataType: "string" }
                ];

                expect(mergedArgs.knownArgs.length).toBe(expectedArgs.length);
                for (const [idx, arg] of mergedArgs.knownArgs.entries()) {
                    expect(arg).toMatchObject(expectedArgs[idx]);
                    expect(arg.secure || arg.argValue).toBeDefined();
                    expect(arg.argLoc.locType).toBe(ProfLocType.OLD_PROFILE);
                    expect(arg.argLoc.osLoc[0]).toMatch(/(base_apiml|lpar1_zosmf)\.yaml$/);
                }
            });

            it("should find known args defined with kebab case names: oldSchool", async () => {
                const profInfo = createNewProfInfo(homeDirPath);
                await profInfo.readProfilesFromDisk();
                const profAttrs = profInfo.getAllProfiles("zosmf").find(obj => obj.profName === "lpar2_zosmf");
                delete (profInfo as any).mOldSchoolProfileDefaults.base;
                const mergedArgs = profInfo.mergeArgsForProfile(profAttrs);

                const expectedArgs = [
                    { argName: "host", dataType: "string" },
                    { argName: "port", dataType: "number" },
                    { argName: "user", dataType: "string" },
                    { argName: "password", dataType: "string" },
                    { argName: "rejectUnauthorized", dataType: "boolean" }
                ];

                expect(mergedArgs.knownArgs.length).toBe(expectedArgs.length);
                for (const [idx, arg] of mergedArgs.knownArgs.entries()) {
                    expect(arg).toMatchObject(expectedArgs[idx]);
                    expect(arg.secure || arg.argValue).toBeDefined();
                    expect(arg.argLoc.locType).toBe(ProfLocType.OLD_PROFILE);
                    expect(arg.argLoc.osLoc[0]).toMatch(/lpar2_zosmf\.yaml$/);
                }
            });

            it("should list optional args missing in service profile: oldSchool", async () => {
                const profInfo = createNewProfInfo(homeDirPath);
                await profInfo.readProfilesFromDisk();
                const profAttrs = profInfo.getAllProfiles("zosmf").find(obj => obj.profName === "lpar3_zosmf");
                delete (profInfo as any).mOldSchoolProfileDefaults.base;
                jest.spyOn(profInfo as any, "loadSchema").mockReturnValue(profSchema);
                const mergedArgs = profInfo.mergeArgsForProfile(profAttrs);

                const expectedArgs = [
                    { argName: "user", dataType: "string", argValue: "admin" },
                    { argName: "password", dataType: "string", argValue: "admin" }
                ];

                expect(mergedArgs.missingArgs.length).toBe(expectedArgs.length);
                for (const [idx, arg] of mergedArgs.missingArgs.entries()) {
                    expect(arg).toMatchObject(expectedArgs[idx]);
                    expect(arg.argLoc.locType).toBe(ProfLocType.DEFAULT);
                    expect(arg.argLoc.osLoc).toBeUndefined();
                }
            });

            it("should throw if there are required args missing in service profile: oldSchool", async () => {
                const profInfo = createNewProfInfo(homeDirPath);
                await profInfo.readProfilesFromDisk();
                const profAttrs = profInfo.getDefaultProfile("zosmf");
                jest.spyOn(profInfo as any, "loadSchema").mockReturnValue(requiredProfSchema);

                let caughtError;
                try {
                    profInfo.mergeArgsForProfile(profAttrs);
                } catch (error) {
                    expect(error instanceof ProfInfoErr).toBe(true);
                    caughtError = error;
                }

                expect(caughtError).toBeDefined();
                expect(caughtError.errorCode).toBe(ProfInfoErr.MISSING_REQ_PROP);
                expect(caughtError.message).toContain("Missing required properties: protocol");
            });

            it("should validate profile for missing args when schema exists: oldSchool", async () => {
                const profInfo = createNewProfInfo(homeDirPath);
                await profInfo.readProfilesFromDisk();
                const profAttrs = profInfo.getAllProfiles("zosmf").find(obj => obj.profName === "lpar3_zosmf");
                delete (profInfo as any).mOldSchoolProfileDefaults.base;
                const mergedArgs = profInfo.mergeArgsForProfile(profAttrs);

                const expectedArgs = [
                    { argName: "user", dataType: "string" },
                    { argName: "password", dataType: "string" },
                    { argName: "basePath", dataType: "string" }
                ];

                expect(mergedArgs.missingArgs.length).toBe(expectedArgs.length);
                for (const [idx, arg] of mergedArgs.missingArgs.entries()) {
                    expect(arg).toMatchObject(expectedArgs[idx]);
                    expect(arg.argLoc.locType).toBe(ProfLocType.DEFAULT);
                    expect(arg.argLoc.osLoc).toBeUndefined();
                }
            });

            it("should throw if schema fails to load: oldSchool", async () => {
                const profInfo = createNewProfInfo(homeDirPath);
                await profInfo.readProfilesFromDisk();
                const profAttrs = profInfo.getDefaultProfile("zosmf");
                jest.spyOn(profInfo as any, "loadSchema").mockReturnValueOnce(null);
                let caughtError;

                try {
                    profInfo.mergeArgsForProfile(profAttrs);
                } catch (error) {
                    expect(error instanceof ProfInfoErr).toBe(true);
                    caughtError = error;
                }

                expect(caughtError).toBeDefined();
                expect(caughtError.errorCode).toBe(ProfInfoErr.LOAD_SCHEMA_FAILED);
                expect(caughtError.message).toContain("Failed to load schema for profile type zosmf");
            });
        });

        describe("mergeArgsForProfileType", () => {
            it("should find known args in base profile: oldSchool", async () => {
                const profInfo = createNewProfInfo(homeDirPath);
                await profInfo.readProfilesFromDisk();
                jest.spyOn(profInfo as any, "loadSchema").mockReturnValueOnce({});
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
                    expect(arg.argLoc.locType).toBe(ProfLocType.OLD_PROFILE);
                    expect(arg.argLoc.osLoc[0]).toMatch(/base_for_userNm\.yaml$/);
                }
            });
        });

        describe("loadAllSchemas", () => {
            it("should throw when schema file is invalid: oldSchool", async () => {
                const profInfo = createNewProfInfo(homeDirPath);
                await profInfo.readProfilesFromDisk();
                jest.spyOn(ProfileIO, "readMetaFile").mockImplementationOnce(() => {
                    throw new Error("bad meta")
                });
                let caughtError;

                try {
                    (profInfo as any).loadAllSchemas();
                } catch (error) {
                    expect(error instanceof ProfInfoErr).toBe(true);
                    caughtError = error;
                }

                expect(caughtError).toBeDefined();
                expect(caughtError.errorCode).toBe(ProfInfoErr.LOAD_SCHEMA_FAILED);
                expect(caughtError.message).toContain("Failed to load schema for profile type");
                expect(caughtError.message).toContain("invalid meta file");
            });
        })
    });

    describe("loadSecureArg", () => {
        it("should load secure args from team config", async () => {
            const profInfo = createNewProfInfo(teamProjDir);
            await profInfo.readProfilesFromDisk();
            const profAttrs = profInfo.getDefaultProfile("zosmf");
            const mergedArgs = profInfo.mergeArgsForProfile(profAttrs);

            const userArg = mergedArgs.knownArgs.find((arg) => arg.argName === "user");
            expect(userArg.argValue).toBeUndefined();
            expect(profInfo.loadSecureArg(userArg)).toBe("userNameBase");

            const passwordArg = mergedArgs.knownArgs.find((arg) => arg.argName === "password");
            expect(passwordArg.argValue).toBeUndefined();
            expect(profInfo.loadSecureArg(passwordArg)).toBe("passwordBase");
        });

        it("should load secure args from old school profiles", async () => {
            const profInfo = createNewProfInfo(homeDirPath);
            await profInfo.readProfilesFromDisk();
            const profAttrs = profInfo.getDefaultProfile("zosmf");
            const mergedArgs = profInfo.mergeArgsForProfile(profAttrs);

            const userArg = mergedArgs.knownArgs.find((arg) => arg.argName === "user");
            expect(userArg.argValue).toBeUndefined();
            expect(profInfo.loadSecureArg(userArg)).toBe("someUser");

            const passwordArg = mergedArgs.knownArgs.find((arg) => arg.argName === "password");
            expect(passwordArg.argValue).toBeUndefined();
            expect(profInfo.loadSecureArg(passwordArg)).toBe("somePassword");
        });

        it("should fail to load secure arg when not found", async () => {
            const profInfo = createNewProfInfo(teamProjDir);
            let caughtError;

            try {
                profInfo.loadSecureArg({
                    argName: "test",
                    dataType: "string",
                    argValue: undefined,
                    argLoc: { locType: ProfLocType.DEFAULT }
                });
            } catch (error) {
                caughtError = error;
            }

            expect(caughtError).toBeDefined();
            expect(caughtError.message).toBe("Failed to locate the property test");
        });
    });

    describe("failure cases", () => {
        it("readProfilesFromDisk should throw if secure credentials fail to load", async () => {
            const profInfo = createNewProfInfo(teamProjDir);
            jest.spyOn((profInfo as any).mCredentials, "isSecured", "get").mockReturnValueOnce(true);
            jest.spyOn((profInfo as any).mCredentials, "loadManager").mockImplementationOnce(async () => {
                throw new Error("bad credential manager");
            });
            let caughtError;

            try {
                await profInfo.readProfilesFromDisk();
            } catch (error) {
                caughtError = error;
            }

            expect(caughtError).toBeDefined();
            expect(caughtError.message).toBe("Failed to initialize secure credential manager");
        });

        it("mergeArgsForProfile should throw if profile location type is invalid", () => {
            const profInfo = createNewProfInfo(teamProjDir);
            let caughtError;

            try {
                profInfo.mergeArgsForProfile({
                    profName: null,
                    profType: "test",
                    isDefaultProfile: false,
                    profLoc: { locType: ProfLocType.DEFAULT }
                });
            } catch (error) {
                expect(error instanceof ProfInfoErr).toBe(true);
                caughtError = error;
            }

            expect(caughtError).toBeDefined();
            expect(caughtError.errorCode).toBe(ProfInfoErr.INVALID_PROF_LOC_TYPE);
            expect(caughtError.message).toContain("Invalid profile location type: DEFAULT");
        });

        it("loadSchema should return null if schema is not found", () => {
            const profInfo = createNewProfInfo(teamProjDir);
            let schema: IProfileSchema;
            let caughtError;

            try {
                schema = (profInfo as any).loadSchema({
                    profName: "fake",
                    profType: "test",
                    isDefaultProfile: false,
                    profLoc: { locType: ProfLocType.DEFAULT }
                });
            } catch (error) {
                caughtError = error;
            }

            expect(caughtError).toBeUndefined();
            expect(schema).toBeNull();
        });
    });
});
