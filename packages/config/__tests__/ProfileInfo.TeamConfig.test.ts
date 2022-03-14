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
import { IProfAttrs } from "../src/doc/IProfAttrs";
import { IProfArgAttrs } from "../src/doc/IProfArgAttrs";
import { IProfOpts } from "../src/doc/IProfOpts";
import { ProfInfoErr } from "../src/ProfInfoErr";
import { Config } from "../src/Config";
import { IConfigOpts } from "../src/doc/IConfigOpts";
import { ProfLocType } from "../src/doc/IProfLoc";
import { IProfileSchema } from "../../profiles";
import { AbstractSession, SessConstants } from "../../rest";
import { ConfigAutoStore } from "../src/ConfigAutoStore";
import { ImperativeConfig } from "../../utilities/src/ImperativeConfig";

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
    const tsoProfName = "LPAR1.tsoProfName";
    const tsoJsonLoc = "profiles.LPAR1.profiles." + tsoName;
    const testDir = path.join(__dirname, "__resources__");
    const teamProjDir = path.join(testDir, testAppNm + "_team_config_proj");
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
        process.env[testEnvPrefix + "_CLI_HOME"] = teamProjDir;
    });

    afterAll(() => {
        // ensure that jest reports go to the right place
        process.chdir(origDir);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("Test Utility functions", () => {
        describe("profAttrsToProfLoaded", () => {
            const profAttrs: IProfAttrs = {
                profName: "profName1",
                profType: "profType1",
                profLoc: {
                    locType: ProfLocType.TEAM_CONFIG,
                    osLoc: ["somewhere in the OS 1", "somewhere in the OS 2"],
                    jsonLoc: "somewhere in the JSON file"
                },
                isDefaultProfile: true
            };

            it("should copy with no dfltProfLoadedVals", async () => {
                const profLoaded = ProfileInfo.profAttrsToProfLoaded(profAttrs);
                expect(profLoaded.name).toBe(profAttrs.profName);
                expect(profLoaded.type).toBe(profAttrs.profType);
                expect(profLoaded.message).toBe("");
                expect(profLoaded.failNotFound).toBe(false);

                expect(profLoaded.profile.profName).toBe(profAttrs.profName);
                expect(profLoaded.profile.profType).toBe(profAttrs.profType);
                expect(profLoaded.profile.profLoc.locType).toBe(profAttrs.profLoc.locType);
                expect(profLoaded.profile.profLoc.osLoc[0]).toBe(profAttrs.profLoc.osLoc[0]);
                expect(profLoaded.profile.profLoc.osLoc[1]).toBe(profAttrs.profLoc.osLoc[1]);
                expect(profLoaded.profile.profLoc.jsonLoc).toBe(profAttrs.profLoc.jsonLoc);
                expect(profLoaded.profile.isDefaultProfile).toBe(profAttrs.isDefaultProfile);
            });

            it("should copy using dfltProfLoadedVals", async () => {
                const dfltProfLoadedVals: any = {
                    message: "default message",
                    failNotFound: true,
                    referencedBy: "default referencedBy",
                    dependenciesLoaded: false
                };
                const profLoaded = ProfileInfo.profAttrsToProfLoaded(profAttrs, dfltProfLoadedVals);
                expect(profLoaded.name).toBe(profAttrs.profName);
                expect(profLoaded.type).toBe(profAttrs.profType);
                expect(profLoaded.message).toBe(dfltProfLoadedVals.message);
                expect(profLoaded.failNotFound).toBe(dfltProfLoadedVals.failNotFound);
                expect(profLoaded.referencedBy).toBe(dfltProfLoadedVals.referencedBy);
                expect(profLoaded.dependenciesLoaded).toBe(dfltProfLoadedVals.dependenciesLoaded);

                expect(profLoaded.profile.profName).toBe(profAttrs.profName);
                expect(profLoaded.profile.profType).toBe(profAttrs.profType);
                expect(profLoaded.profile.profLoc.locType).toBe(profAttrs.profLoc.locType);
                expect(profLoaded.profile.profLoc.osLoc[0]).toBe(profAttrs.profLoc.osLoc[0]);
                expect(profLoaded.profile.profLoc.osLoc[1]).toBe(profAttrs.profLoc.osLoc[1]);
                expect(profLoaded.profile.profLoc.jsonLoc).toBe(profAttrs.profLoc.jsonLoc);
                expect(profLoaded.profile.isDefaultProfile).toBe(profAttrs.isDefaultProfile);
            });
        });

        describe("createSession", () => {
            const profAttrs: IProfAttrs = {
                profName: "profName",
                profType: "zosmf",
                profLoc: {
                    locType: ProfLocType.TEAM_CONFIG,
                    osLoc: ["somewhere in the OS 1", "somewhere in the OS 1A"],
                    jsonLoc: "somewhere in the JSON file 1"
                },
                isDefaultProfile: true
            };

            // encoding for testUserName:testPassword
            const b64TestAuth = "dGVzdFVzZXJOYW1lOnRlc3RQYXNzd29yZA==";

            const hostInx = 0;
            const portInx = 1;
            const userInx = 2;
            const passInx = 3;
            const rejectInx = 4;

            const profArgs: IProfArgAttrs[] = [
                {
                    argName: "host", dataType: "string", argValue: "testHostName",
                    argLoc: {
                        locType: ProfLocType.TEAM_CONFIG,
                        osLoc: ["somewhere in the OS 2", "somewhere in the OS 2A"],
                        jsonLoc: "somewhere in the JSON file 2"
                    },
                    secure: false
                },
                {
                    argName: "port", dataType: "number", argValue: 12345,
                    argLoc: {
                        locType: ProfLocType.TEAM_CONFIG,
                        osLoc: ["somewhere in the OS 3", "somewhere in the OS 3A"],
                        jsonLoc: "somewhere in the JSON file 3"
                    },
                    secure: false
                },
                {
                    argName: "user", dataType: "string", argValue: "testUserName",
                    argLoc: {
                        locType: ProfLocType.TEAM_CONFIG
                    },
                },
                {
                    argName: "password", dataType: "string", argValue: "testPassword",
                    argLoc: {
                        locType: ProfLocType.TEAM_CONFIG
                    },
                },
                {
                    argName: "rejectUnauthorized", dataType: "boolean", argValue: false,
                    argLoc: {
                        locType: ProfLocType.TEAM_CONFIG
                    },
                },
            ];

            it("should create a session", async () => {
                const newSess = ProfileInfo.createSession(profArgs);
                expect(newSess.ISession.hostname).toBe(profArgs[hostInx].argValue);
                expect(newSess.ISession.port).toBe(profArgs[portInx].argValue);
                expect(newSess.ISession.user).toBe(profArgs[userInx].argValue);
                expect(newSess.ISession.password).toBe(profArgs[passInx].argValue);
                expect(newSess.ISession.rejectUnauthorized).toBe(profArgs[rejectInx].argValue);
                expect(newSess.ISession.type).toBe(SessConstants.AUTH_TYPE_BASIC);
                expect(newSess.ISession.protocol).toBe(SessConstants.HTTPS_PROTOCOL);
                expect(newSess.ISession.secureProtocol).toBe(AbstractSession.DEFAULT_SECURE_PROTOCOL);
                expect(newSess.ISession.basePath).toBe(AbstractSession.DEFAULT_BASE_PATH);
                expect(newSess.ISession.base64EncodedAuth).toBe(b64TestAuth);
                expect(newSess.ISession.tokenType).toBeUndefined();
                expect(newSess.ISession.tokenValue).toBeUndefined();
            });
        });
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
                const profInfo = createNewProfInfo(teamProjDir);
                await profInfo.readProfilesFromDisk();

                expect(profInfo.usingTeamConfig).toBe(true);
                const teamConfig: Config = profInfo.getTeamConfig();
                expect(teamConfig).not.toBeNull();
                expect(teamConfig.exists).toBe(true);
            });

            it("should successfully read a team config from a starting directory", async () => {
                // ensure that we are not in the team project directory
                const profInfo = createNewProfInfo(origDir);

                const teamCfgOpts: IConfigOpts = { projectDir: teamProjDir };
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
                        switch (prof.profType) {
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
                required: ["protocol"]
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

                const profInfo = createNewProfInfo(teamProjDir, { overrideWithEnv: true });
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
                ];
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
                    throw new Error("bad schema");
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

        describe("updateProperty", () => {
            it("should throw and error if the desired profile is not found", async () => {
                const profInfo = createNewProfInfo(teamProjDir);
                await profInfo.readProfilesFromDisk();
                jest.spyOn(profInfo as any, "getAllProfiles").mockReturnValue([]);
                let caughtError;
                try {
                    await profInfo.updateProperty({ profileName: "test", profileType: "base", property: "host", value: "test" });
                } catch (error) {
                    caughtError = error;
                }

                expect(caughtError).toBeDefined();
                expect(caughtError.errorCode).toBe(ProfInfoErr.PROF_NOT_FOUND);
                expect(caughtError.message).toContain("Failed to find profile");
            });

            it("should succeed if the property was updated with updateKnownProperty", async () => {
                const profInfo = createNewProfInfo(teamProjDir);
                await profInfo.readProfilesFromDisk();
                jest.spyOn(profInfo as any, "getAllProfiles").mockReturnValue([{ profName: "test" }]);
                jest.spyOn(profInfo as any, "mergeArgsForProfile").mockReturnValue({});
                const updateKnownPropertySpy = jest.spyOn(profInfo as any, "updateKnownProperty").mockResolvedValue(true);
                let caughtError;
                try {
                    await profInfo.updateProperty({ profileName: "test", profileType: "base", property: "host", value: "test" });
                } catch (error) {
                    caughtError = error;
                }
                expect(caughtError).toBeUndefined();
                expect(updateKnownPropertySpy).toHaveBeenCalledWith({}, "host", "test");
            });

            it("should attempt to store session config properties without adding profile types to the loadedConfig", async () => {
                const profInfo = createNewProfInfo(teamProjDir);
                await profInfo.readProfilesFromDisk();
                jest.spyOn(profInfo as any, "updateKnownProperty").mockResolvedValue(false);
                const storageSpy = jest.spyOn(ConfigAutoStore as any, "_storeSessCfgProps").mockResolvedValue(undefined);
                const profiles = [{ type: "dummy", schema: {} as any }];
                ImperativeConfig.instance.loadedConfig.profiles = profiles;
                ImperativeConfig.instance.loadedConfig.baseProfile = profiles[0];

                let caughtError;
                try {
                    await profInfo.updateProperty({ profileName: "LPAR4", profileType: "dummy", property: "host", value: "test" });
                } catch (error) {
                    caughtError = error;
                }
                expect(caughtError).toBeUndefined();
                expect(ImperativeConfig.instance.loadedConfig.profiles).toEqual(profiles);
                expect(ImperativeConfig.instance.loadedConfig.baseProfile).toEqual(profiles[0]);
                expect(storageSpy).toHaveBeenCalledWith({
                    defaultBaseProfileName: "base_glob",
                    sessCfg: { hostname: "test" },
                    propsToStore: ["host"],
                    profileName: "LPAR4",
                    profileType: "dummy"
                });
            });

            it("should add the missing profile type (and schema) to loadedConfig before attempting to store session config properties", async () => {
                const profInfo = createNewProfInfo(teamProjDir);
                await profInfo.readProfilesFromDisk();
                jest.spyOn(profInfo as any, "updateKnownProperty").mockResolvedValue(false);
                const storageSpy = jest.spyOn(ConfigAutoStore as any, "_storeSessCfgProps").mockResolvedValue(undefined);
                const profiles = [{ type: "test", schema: {} as any }];
                ImperativeConfig.instance.loadedConfig.profiles = profiles;
                ImperativeConfig.instance.loadedConfig.baseProfile = null;

                let caughtError;
                try {
                    await profInfo.updateProperty({ profileName: "LPAR4", profileType: "dummy", property: "host", value: "test" });
                } catch (error) {
                    caughtError = error;
                }
                expect(caughtError).toBeUndefined();
                expect(ImperativeConfig.instance.loadedConfig.profiles).toContain(profiles[0]);
                expect(ImperativeConfig.instance.loadedConfig.baseProfile).toBeDefined();
                expect(storageSpy).toHaveBeenCalledWith({
                    defaultBaseProfileName: "base_glob",
                    sessCfg: { hostname: "test" },
                    propsToStore: ["host"],
                    profileName: "LPAR4",
                    profileType: "dummy"
                });
            });
        });

        describe("updateKnownProperty", () => {
            it("should throw and error if the property location type is invalid", async () => {
                const profInfo = createNewProfInfo(teamProjDir);
                await profInfo.readProfilesFromDisk();
                let caughtError;
                try {
                    await profInfo.updateKnownProperty({
                        knownArgs: [{ argName: "test", argLoc: { locType: 123 } }]
                    } as any, "test", "test");
                } catch (error) {
                    caughtError = error;
                }

                expect(caughtError).toBeDefined();
                expect(caughtError.errorCode).toBe(ProfInfoErr.INVALID_PROF_LOC_TYPE);
                expect(caughtError.message).toContain("Invalid profile location type: 123");
            });

            it("should resolve to false if the property location cannot be determined", async () => {
                const profInfo = createNewProfInfo(teamProjDir);
                await profInfo.readProfilesFromDisk();
                expect(await profInfo.updateKnownProperty({
                    knownArgs: [{
                        argName: "test", argLoc: {
                            locType: ProfLocType.ENV
                        }
                    }]
                } as any, "test", "test")).toBe(false);

                expect(await profInfo.updateKnownProperty({
                    knownArgs: [{
                        argName: "test", argLoc: {
                            locType: ProfLocType.DEFAULT
                        }
                    }]
                } as any, "test", "test")).toBe(false);
            });

            it("should update the given property and return true", async () => {
                const profInfo = createNewProfInfo(teamProjDir);
                await profInfo.readProfilesFromDisk();

                const prof = profInfo.mergeArgsForProfile(profInfo.getAllProfiles("dummy")[0]);
                const ret = await profInfo.updateKnownProperty(prof, "host", "example.com");
                const newHost = profInfo.getTeamConfig().api.layers.get().properties.profiles.LPAR4.properties.host;

                expect(newHost).toEqual("example.com");
                expect(ret).toBe(true);
            });

            it("should remove the given property if the value specified if undefined", async () => {
                const profInfo = createNewProfInfo(teamProjDir);
                await profInfo.readProfilesFromDisk();

                const prof = profInfo.mergeArgsForProfile(profInfo.getAllProfiles("dummy")[0]);
                const ret = await profInfo.updateKnownProperty(prof, "host", undefined);
                const newHost = profInfo.getTeamConfig().api.layers.get().properties.profiles.LPAR4.properties.host;

                expect(newHost).toBeUndefined();
                expect(ret).toBe(true);

                // back to original host
                await profInfo.updateKnownProperty(prof, "host", "LPAR4.your.domain.net");
            });
        });
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

        it("should get secure values with mergeArgsForProfile:getSecureVals for team config", async () => {
            const profInfo = createNewProfInfo(teamProjDir);
            await profInfo.readProfilesFromDisk();
            const profAttrs = profInfo.getDefaultProfile("zosmf");
            const mergedArgs = profInfo.mergeArgsForProfile(profAttrs, { getSecureVals: true });

            const userArg = mergedArgs.knownArgs.find((arg) => arg.argName === "user");
            expect(userArg.argValue).toBe("userNameBase");

            const passwordArg = mergedArgs.knownArgs.find((arg) => arg.argName === "password");
            expect(passwordArg.argValue).toBe("passwordBase");
        });

        it("should treat secure arg as plain text if loaded from environment variable", async () => {
            const profInfo = createNewProfInfo(teamProjDir);
            const expectedValue = "insecure";
            const actualValue = profInfo.loadSecureArg({
                argName: "test",
                dataType: "string",
                argValue: expectedValue,
                argLoc: { locType: ProfLocType.ENV }
            });

            expect(actualValue).toEqual(expectedValue);
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
