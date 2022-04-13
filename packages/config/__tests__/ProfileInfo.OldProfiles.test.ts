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
import { IProfOpts } from "../src/doc/IProfOpts";
import { ProfInfoErr } from "../src/ProfInfoErr";
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

describe("Old-school ProfileInfo tests", () => {

    const tsoName = "tsoProfName";
    const testDir = path.join(__dirname, "__resources__");
    const homeDirPath = path.join(testDir, testAppNm + "_home");
    const homeDirPathTwo = path.join(testDir, testAppNm + "_home_two");
    const homeDirPathThree = path.join(testDir, testAppNm + "_home_three");
    const four = 4;
    let origDir: string;

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

    describe("getDefaultProfile", () => {

        afterEach(() => {
            jest.clearAllMocks();
        });

        it("should return null if no default for that type exists 1", async () => {
            const profInfo = createNewProfInfo(homeDirPath);
            const warnSpy = jest.spyOn((profInfo as any).mImpLogger, "warn");
            await profInfo.readProfilesFromDisk();
            const profAttrs = profInfo.getDefaultProfile("ThisTypeDoesNotExist");
            expect(profAttrs).toBeNull();
            expect(warnSpy).toHaveBeenCalledTimes(1);
            expect(warnSpy).toHaveBeenCalledWith("Found no old-school profile for type 'ThisTypeDoesNotExist'.");
        });

        it("should return null if no default for that type exists 2", async () => {
            process.env[testEnvPrefix + "_CLI_HOME"] = homeDirPathTwo;
            const profInfo = createNewProfInfo(homeDirPathTwo);
            const warnSpy = jest.spyOn((profInfo as any).mImpLogger, "warn");
            await profInfo.readProfilesFromDisk();
            const profAttrs = profInfo.getDefaultProfile("zosmf");
            expect(profAttrs).toBeNull();
            expect(warnSpy).toHaveBeenCalledTimes(four);
            expect(warnSpy).toHaveBeenLastCalledWith("Found no default old-school profiles.");
        });

        it("should return null if no default for that type exists 3", async () => {
            process.env[testEnvPrefix + "_CLI_HOME"] = homeDirPathThree;
            const profInfo = createNewProfInfo(homeDirPathThree);
            const warnSpy = jest.spyOn((profInfo as any).mImpLogger, "warn");
            await profInfo.readProfilesFromDisk();
            const profAttrs = profInfo.getDefaultProfile("zosmf");
            expect(profAttrs).toBeNull();
            expect(warnSpy).toHaveBeenCalledTimes(four);
            expect(warnSpy).toHaveBeenLastCalledWith("Found no old-school profiles.");
        });

        it("should return a profile if one exists", async () => {
            const profInfo = createNewProfInfo(homeDirPath);
            await profInfo.readProfilesFromDisk();
            const desiredProfType = "tso";
            const profAttrs = profInfo.getDefaultProfile(desiredProfType);

            expect(profAttrs).not.toBeNull();
            expect(profAttrs.isDefaultProfile).toBe(true);
            expect(profAttrs.profName).toBe(tsoName);
            expect(profAttrs.profType).toBe(desiredProfType);
            expect(profAttrs.profLoc.locType).not.toBeNull();

            const retrievedOsLoc = path.normalize(profAttrs.profLoc.osLoc[0].path);
            const expectedOsLoc = path.join(homeDirPath, "profiles",
                desiredProfType, profAttrs.profName + ".yaml"
            );
            expect(retrievedOsLoc).toBe(expectedOsLoc);

            expect(profAttrs.profLoc.jsonLoc).toBeUndefined();
        });
    });

    describe("getAllProfiles", () => {
        it("should return all profiles if no type is specified", async () => {
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
                    switch (prof.profType) {
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
                expect(prof.profLoc.osLoc[0].path).toEqual(path.join(homeDirPath, "profiles", prof.profType, prof.profName + ".yaml"));
                expectedProfileNames = expectedProfileNames.filter(obj => obj !== prof.profName);
            }
            expect(actualDefaultProfiles).toEqual(expectedDefaultProfiles);
            expect(expectedProfileNames.length).toEqual(0);
        });

        it("should return some profiles if a type is specified", async () => {
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
                expect(prof.profLoc.osLoc[0].path).toEqual(path.join(homeDirPath, "profiles", prof.profType, prof.profName + ".yaml"));
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
            required: ["protocol"]
        };

        it("should find known args in simple service profile", async () => {
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
                expect(arg.argLoc.osLoc[0].path).toMatch(/lpar1_zosmf\.yaml$/);
            }
        });

        it("should find known args in service and base profile", async () => {
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
                expect(arg.argLoc.osLoc[0].path).toMatch(/(base_apiml|lpar1_zosmf)\.yaml$/);
            }
        });

        it("should find known args defined with kebab case names", async () => {
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
                expect(arg.argLoc.osLoc[0].path).toMatch(/lpar2_zosmf\.yaml$/);
            }
        });

        it("should list optional args missing in service profile", async () => {
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

        it("should throw if there are required args missing in service profile", async () => {
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

        it("should validate profile for missing args when schema exists", async () => {
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

        it("should throw if schema fails to load", async () => {
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
        it("should find known args in base profile", async () => {
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
                expect(arg.argLoc.osLoc[0].path).toMatch(/base_for_userNm\.yaml$/);
            }
        });
    });

    describe("loadAllSchemas", () => {
        it("should throw when schema file is invalid", async () => {
            const profInfo = createNewProfInfo(homeDirPath);
            await profInfo.readProfilesFromDisk();
            jest.spyOn(ProfileIO, "readMetaFile").mockImplementationOnce(() => {
                throw new Error("bad meta");
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
    });

    describe("updateProperty and updateKnownProperty", () => {
        it("should succeed if the property is known", async () => {
            const testProf = "lpar4_zosmf";
            const testHost = "lpar4.fakehost.com";
            const profInfo = createNewProfInfo(homeDirPath);
            await profInfo.readProfilesFromDisk();
            const before = profInfo.mergeArgsForProfile(profInfo.getAllProfiles("zosmf").find(v => v.profName === testProf));
            await profInfo.updateProperty({ profileName: testProf, profileType: "zosmf", property: "host", value: "example.com" });
            const after = profInfo.mergeArgsForProfile(profInfo.getAllProfiles("zosmf").find(v => v.profName === testProf));

            expect(before.knownArgs.find(v => v.argName === "host").argValue).toEqual(testHost);
            expect(after.knownArgs.find(v => v.argName === "host").argValue).toEqual("example.com");

            await profInfo.updateProperty({ profileName: testProf, profileType: "zosmf", property: "host", value: testHost });
            const afterTests = profInfo.mergeArgsForProfile(profInfo.getAllProfiles("zosmf").find(v => v.profName === testProf));
            expect(afterTests.knownArgs.find(v => v.argName === "host").argValue).toEqual(testHost);
        });

        it("should add a new property if it does not exist in the profile then remove it if undefined is specified", async () => {
            const profInfo = createNewProfInfo(homeDirPath);
            await profInfo.readProfilesFromDisk();
            const testProf = "lpar4_zosmf";
            const before = profInfo.mergeArgsForProfile(profInfo.getAllProfiles("zosmf").find(v => v.profName === testProf));
            await profInfo.updateProperty({ profileName: testProf, profileType: "zosmf", property: "dummy", value: "example.com" });
            const after = profInfo.mergeArgsForProfile(profInfo.getAllProfiles("zosmf").find(v => v.profName === testProf));

            expect(before.knownArgs.find(v => v.argName === "dummy")).toBeUndefined();
            expect(after.knownArgs.find(v => v.argName === "dummy").argValue).toEqual("example.com");

            await profInfo.updateProperty({ profileName: testProf, profileType: "zosmf", property: "dummy", value: undefined });
            const removed = profInfo.mergeArgsForProfile(profInfo.getAllProfiles("zosmf").find(v => v.profName === testProf));
            expect(removed.knownArgs.find(v => v.argName === "dummy")).toBeUndefined();
        });
    });

    describe("loadSecureArg", () => {
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

        it("should get secure values with mergeArgsForProfile:getSecureVals for old school profiles", async () => {
            const profInfo = createNewProfInfo(homeDirPath);
            await profInfo.readProfilesFromDisk();
            const profAttrs = profInfo.getDefaultProfile("zosmf");
            const mergedArgs = profInfo.mergeArgsForProfile(profAttrs, { getSecureVals: true });

            const userArg = mergedArgs.knownArgs.find((arg) => arg.argName === "user");
            expect(userArg.argValue).toBe("someUser");

            const passwordArg = mergedArgs.knownArgs.find((arg) => arg.argName === "password");
            expect(passwordArg.argValue).toBe("somePassword");
        });
    });
});
