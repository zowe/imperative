/*
* This program and the accompanying materials are made available under the terms of the *
* Eclipse Public License v2.0 which accompanies this distribution, and is available at *
* https://www.eclipse.org/legal/epl-v20.html                                      *
*                                                                                 *
* SPDX-License-Identifier: EPL-2.0                                                *
*                                                                                 *
* Copyright Contributors to the Zowe Project.                                     *
*/

import { ImperativeConfig } from "../src/ImperativeConfig";
import { DefinitionTreeResolver, IImperativeConfig } from "..";
import { CommandPreparer, Constants, ICommandDefinition, ICommandProfileTypeConfiguration } from "../..";
import { CompleteProfilesGroupBuilder } from "../src/profiles/builders/CompleteProfilesGroupBuilder";
import { EnvironmentalVariableSettings } from "../";

describe("ImperativeConfig", () => {
    beforeEach(() => {
        const impConfig = ImperativeConfig.instance as any;
        impConfig.mInstance = null;
    });

    describe("instance", () => {
        it("should initialize properly during first time initialization", () => {
            expect(ImperativeConfig.instance).toBeTruthy();
        });

        it("should initialize properly during multiple instantiations", () => {
            expect(ImperativeConfig.instance).toBe(ImperativeConfig.instance);
        });
    });

    describe("callerFunction", () => {
        it("should set and get properly", () => {
            const impConfig = ImperativeConfig.instance;
            const testPath = "this/is/a/test/path";

            impConfig.callerLocation = testPath;
            expect(impConfig.callerLocation).toBe(testPath);
        });
    });

    describe("loadedConfig", () => {
        it("should set and get properly", () => {
            const impConfig = ImperativeConfig.instance;
            const testObj: IImperativeConfig = {};

            impConfig.loadedConfig = testObj;
            expect(impConfig.loadedConfig).toBe(testObj);
        });
    });

    describe("addCommandGroup", () => {
        let impConfig: ImperativeConfig;

        beforeEach(() => {
            impConfig = ImperativeConfig.instance;
            impConfig.loadedConfig = {};
        });

        it("should do nothing when loadedConfig is not defined", () => {
            impConfig.loadedConfig = null;
            const test1: ICommandDefinition = {name: "testDef1", type: "group", description: "test description 1"};
            expect(impConfig.addCmdGrpToLoadedConfig(test1)).toBeUndefined();
        });

        it("should add definition when provided proper command", () => {
            const test1: ICommandDefinition = {name: "testDef1", type: "group", description: "test description 1"};

            impConfig.addCmdGrpToLoadedConfig(test1);

            expect(impConfig.loadedConfig.definitions.length).toBe(1);
            expect(impConfig.loadedConfig.definitions[0]).toBe(test1);

            const test2: ICommandDefinition = {name: "testDef2", type: "group", description: "test description 2"};

            impConfig.addCmdGrpToLoadedConfig(test2);

            expect(impConfig.loadedConfig.definitions.length).toBe(2);
            expect(impConfig.loadedConfig.definitions[1]).toBe(test2);
        });

        it("should allow add the same definition without causing issue", () => {
            const testDef: ICommandDefinition = {name: "testDef1", type: "group", description: "test description 1"};

            impConfig.addCmdGrpToLoadedConfig(testDef);

            expect(impConfig.loadedConfig.definitions.length).toBe(1);
            expect(impConfig.loadedConfig.definitions[0]).toBe(testDef);

            impConfig.addCmdGrpToLoadedConfig(testDef);

            expect(impConfig.loadedConfig.definitions.length).toBe(1);
            expect(impConfig.loadedConfig.definitions[0]).toBe(testDef);
        });
    });

    describe("addProfiles", () => {
        let impConfig: ImperativeConfig;
        const existingProfile: ICommandProfileTypeConfiguration = {
            type: "existingProfile",
            schema: {
                type: "object",
                title: "Get a name(type) conflict",
                description: "Existing profile description",
                properties: {
                    size: {
                        optionDefinition: {
                            description: "size description",
                            type: "string",
                            name: "size",
                            aliases: ["s"],
                            required: true
                        },
                        type: "string"
                    }
                }
            }
        };

        beforeEach(() => {
            impConfig = ImperativeConfig.instance;
            impConfig.loadedConfig = {};
        });

        it("should do nothing when loadedConfig is not defined", () => {
            impConfig.loadedConfig = null;
            const profilesToAdd: ICommandProfileTypeConfiguration[] = [];
            impConfig.addProfiles(profilesToAdd);
            expect(impConfig.loadedConfig).toBe(null);
        });

        it("should create an empty set of profiles when loadedConfig has no profiles property", () => {
            const profilesToAdd: ICommandProfileTypeConfiguration[] = [];
            impConfig.addProfiles(profilesToAdd);
            expect(impConfig.loadedConfig.profiles.length).toBe(0);
        });

        it("should prevent the loading of an existing profile", () => {
            impConfig.loadedConfig.profiles = [existingProfile];
            const profilesToAdd: ICommandProfileTypeConfiguration[] = [existingProfile];

            expect(impConfig.loadedConfig.profiles.length).toBe(1);
            impConfig.addProfiles(profilesToAdd);
            expect(impConfig.loadedConfig.profiles.length).toBe(1);
        });

        it("should add a non-existing profile", () => {
            const newProfile: ICommandProfileTypeConfiguration = {
                type: "newProfile",
                schema: {
                    type: "object",
                    title: "A non-existing profile",
                    description: "Mon-existing profile description",
                    properties: {
                        size: {
                            optionDefinition: {
                                description: "size description",
                                type: "string",
                                name: "size",
                                aliases: ["s"],
                                required: true
                            },
                            type: "string"
                        }
                    }
                }
            };
            impConfig.loadedConfig.profiles = [existingProfile];
            const profilesToAdd: ICommandProfileTypeConfiguration[] = [newProfile];

            expect(impConfig.loadedConfig.profiles.length).toBe(1);
            impConfig.addProfiles(profilesToAdd);
            expect(impConfig.loadedConfig.profiles.length).toBe(2);
        });
    });

    describe("cliHome", () => {
        let impConfig: ImperativeConfig;
        beforeEach(() => {
            impConfig = ImperativeConfig.instance;
        });

        it("should return default home when no home environment variable is defined", () => {
            const config = {defaultHome: "default home", name: "myname"};
            impConfig.loadedConfig = config;

            expect(impConfig.cliHome).toBe(config.defaultHome);
        });

        it("should return proper path when using the ", () => {
            const config = {envVariablePrefix: "TESTHOME"};
            process.env["TESTHOME" + EnvironmentalVariableSettings.CLI_HOME_SUFFIX] = "myhome";
            impConfig.loadedConfig = config;
            const expectedCliHome = process.env["TESTHOME" + EnvironmentalVariableSettings.CLI_HOME_SUFFIX];

            expect(impConfig.cliHome).toBe(expectedCliHome);
        });

        it("should return default home when the defined home environment does not exist", () => {
            const config = {
                envVariablePrefix: "doesnotexistprefixzzzzz",
                defaultHome: "default home"
            };
            impConfig.loadedConfig = config;

            expect(impConfig.cliHome).toBe(config.defaultHome);
        });
    });

    describe("profileDir", () => {
        it("should return the proper directory", () => {
            const config = {defaultHome: "this/is/default/home"};
            const impConfig = ImperativeConfig.instance;

            impConfig.loadedConfig = config;

            expect(impConfig.profileDir).toBe(config.defaultHome + Constants.PROFILES_DIR + "/");
        });
    });

    describe("Command tree functions", () => {
        const impConfig = ImperativeConfig.instance as any;
        const mockResolve = jest.fn();
        const orgResolve = DefinitionTreeResolver.resolve;
        const mockAutoGenCmd = jest.fn();
        const orgAutoGenCmd = impConfig.addAutoGeneratedCommands;
        const mockPrepare = jest.fn();
        const orgPrepare = CommandPreparer.prepare;

        beforeEach(() => {
            impConfig.addAutoGeneratedCommands = mockAutoGenCmd;
            DefinitionTreeResolver.resolve = mockResolve;
            CommandPreparer.prepare = mockPrepare;
        });

        afterEach(() => {
            impConfig.addAutoGeneratedCommands = orgAutoGenCmd;
            DefinitionTreeResolver.resolve = orgResolve;
            CommandPreparer.prepare = orgPrepare;
        });

        it("should return the resolved and prepared command trees", () => {
            const mockResolvedCmdTree = {
                name: "Pretend this has been resolved"
            };
            const mockPreparedCmdTree = {
                name: "Pretend this has been prepared"
            };
            impConfig.callerLocation = "this/is/a/test/path";

            impConfig.loadedConfig = {
                definitions: [
                    {
                        name: "Some command group",
                        description: "Pick fruit",
                        type: "group",
                        children: [
                            {
                                name: "pineapple",
                                description: "Pick a pineapple",
                                type: "command",
                                handler: "C:\\SomePathTo\\imperative-sample\\lib\\imperative/../commands/pick/PickPineappleHandler"
                            }
                        ]
                    }
                ],
                rootCommandDescription: "Sample command line interface",
                productDisplayName: "Sample CLI",
                name: "sample-cli",
            };

            mockResolve.mockReturnValueOnce(mockResolvedCmdTree);
            mockAutoGenCmd.mockReturnValueOnce(mockPreparedCmdTree);
            mockPrepare.mockReturnValueOnce(mockPreparedCmdTree);

            // first function that we really want to test
            expect(impConfig.resolvedCmdTree).toBe(mockResolvedCmdTree);
            expect(mockResolve).toBeCalled();

            // second function that we really want to test
            expect(impConfig.getPreparedCmdTree(mockResolvedCmdTree)).toBe(mockPreparedCmdTree);
            expect(mockAutoGenCmd).toBeCalled();
            expect(mockPrepare).toBeCalled();
        });
    });

    describe("callerPackageJson", () => {
        const impConfig = ImperativeConfig.instance;
        const mockGetCallerFile = jest.fn();
        const orgGetCallerFile = impConfig.getCallerFile;

        beforeEach(() => {
            impConfig.getCallerFile = mockGetCallerFile;
        });

        afterEach(() => {
            impConfig.getCallerFile = orgGetCallerFile;
        });

        it("should call getCallerFile with the proper param", () => {
            const resultObj = {name: "test object"};
            mockGetCallerFile.mockReturnValueOnce(resultObj);

            expect(impConfig.callerPackageJson).toBe(resultObj);
            expect(mockGetCallerFile).toBeCalledWith("package.json");
        });
    });

    describe("getCallerFile", () => {
        const impConfig = ImperativeConfig.instance;

        it("should return the proper required file", () => {
            const testFile = "package.json";

            const result = impConfig.getCallerFile(testFile);

            expect(result).toBeTruthy();
        });

        it("should throw error when cant find file", () => {
            const testFile = "bad-file-name.json";

            try {
                impConfig.getCallerFile(testFile);
            } catch (error) {
                expect(JSON.stringify(error)).toContain("Could not locate the specified module through requiring directly");
            }
        });
    });

    describe("addAutoGeneratedCommands", () => {
        const impConfig = ImperativeConfig.instance as any;
        const mockGetProfileGroup = jest.fn();
        const orgGetProfileGroup = CompleteProfilesGroupBuilder.getProfileGroup;

        beforeEach(() => {
            CompleteProfilesGroupBuilder.getProfileGroup = mockGetProfileGroup;
        });

        afterEach(() => {
            CompleteProfilesGroupBuilder.getProfileGroup = orgGetProfileGroup;
        });

        it("should return proper command definition", () => {
            const testCmd = {};
            const result = impConfig.addAutoGeneratedCommands(testCmd);
            expect(result).toBeTruthy();
        });

        it("should trigger builder when using autoGenerateProfileCommands option", () => {
            const config = {
                autoGenerateProfileCommands: true,
                profiles: ["stub profile"]
            };
            const dummyObj = {name: "dummy object"};
            const testCmd: any = {children: []};

            impConfig.loadedConfig = config;
            mockGetProfileGroup.mockReturnValueOnce(dummyObj);

            const result = impConfig.addAutoGeneratedCommands(testCmd);

            expect(mockGetProfileGroup).toHaveBeenCalledTimes(1);
            expect(result.children[0]).toBe(dummyObj);
        });
    });
});
