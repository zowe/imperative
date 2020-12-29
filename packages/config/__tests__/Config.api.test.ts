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

import * as fs from "fs";
import * as path from "path";
import { Config } from "../src/Config";
import { IConfig } from "../src/doc/IConfig";
import { IConfigProfile } from "../src/doc/IConfigProfile";

const MY_APP = "my_app";

const mergeConfig: IConfig = {
    profiles: {
        fruit: {
            properties: {
                origin: "Costa Rica",
                shipDate: "2000-01-01"
            },
            profiles: {
                apple: {
                    type: "fruit",
                    properties: {
                        color: "green"
                    }
                },
                grape: {
                    type: "fruit",
                    properties: {
                        color: "red"
                    }
                }
            }
        }
    },
    defaults: {
        fruit: "fruit.grape"
    },
    plugins: [
        "@zowe/vegetable-for-imperative"
    ],
    secure: [
        "profiles.fruit.properties.secret"
    ]
};

describe("Config API tests", () => {
    beforeEach(() => {
        jest.spyOn(Config, "search").mockReturnValue(__dirname + "/__resources__/project.config.user.json");
        jest.spyOn(fs, "existsSync").mockReturnValueOnce(true).mockReturnValue(false);
        jest.spyOn(Config.prototype as any, "secureLoad").mockResolvedValue(undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    describe("profiles", () => {
        describe("set", () => {
            it("should set a first level profile", async () => {
                const config = await Config.load(MY_APP);
                const profilesApi = config.api.profiles;
                const fakeProfile: IConfigProfile = {
                    type: "fruit",
                    profiles: {},
                    properties: {
                        color: "green"
                    }
                };
                profilesApi.set("grape", fakeProfile);
                const profile = profilesApi.get("grape");
                expect(profile).toMatchSnapshot();
                expect(profile.color).toEqual("green");
            });
            it("should set a second level profile", async () => {
                const config = await Config.load(MY_APP);
                const profilesApi = config.api.profiles;
                const fakeProfile: IConfigProfile = {
                    type: "fruit",
                    profiles: {},
                    properties: {
                        color: "green"
                    }
                };
                profilesApi.set("fruit.grape", fakeProfile);
                const profile = profilesApi.get("fruit");
                const nestedProfile = profilesApi.get("fruit.grape");
                expect(profile).toMatchSnapshot();
                expect(nestedProfile).toMatchSnapshot();
                expect(nestedProfile.color).toEqual("green");
                expect(nestedProfile.origin).toEqual("California");
            });
            it("should set a second level profile to a first level profile that doesn't exist", async () => {
                const config = await Config.load(MY_APP);
                const profilesApi = config.api.profiles;
                const fakeProfile: IConfigProfile = {
                    type: "vegetable",
                    profiles: {},
                    properties: {
                        color: "brown"
                    }
                };
                profilesApi.set("vegetables.potato", fakeProfile);
                const profile = profilesApi.get("vegetables.potato");
                const nestedProfile = profilesApi.get("vegetables.potato");
                expect(profile).toMatchSnapshot();
                expect(nestedProfile).toMatchSnapshot();
                expect(nestedProfile.color).toEqual("brown");
            });
            it("should successfully set a profile missing properties", async () => {
                const config = await Config.load(MY_APP);
                const profilesApi = config.api.profiles;
                const fakeProfile: IConfigProfile = {
                    type: "fruit",
                    profiles: {},
                    properties: undefined
                };
                profilesApi.set("grape", fakeProfile);
                const profile = profilesApi.get("grape");
                expect(profile).toEqual({});
            });
        });
        describe("get", () => {
            it("should get a first level profile", async () => {
                const config = await Config.load(MY_APP);
                const profile = config.api.profiles.get("fruit");
                expect(profile).toMatchSnapshot();
                expect(profile.origin).toEqual("California");
            });
            it("should get a second level profile", async () => {
                const config = await Config.load(MY_APP);
                const profile = config.api.profiles.get("fruit.apple");
                expect(profile).toMatchSnapshot();
                expect(profile.color).toEqual("red");
                expect(profile.origin).toEqual("California");
            });
            it("should fail to get a profile that doesn't exist", async () => {
                const config = await Config.load(MY_APP);
                const profile = config.api.profiles.get("vegetable");
                expect(profile).toEqual({});
            });
        });
        describe("exists", () => {
            it("should return first layer profile exists if it does", async () => {
                const config = await Config.load(MY_APP);
                const exists = config.api.profiles.exists("fruit");
                expect(exists).toEqual(true);
            });
            it("should return second layer profile exists if it does", async () => {
                const config = await Config.load(MY_APP);
                const exists = config.api.profiles.exists("fruit.apple");
                expect(exists).toEqual(true);
            });
            it("should return first layer profile does not exist", async () => {
                const config = await Config.load(MY_APP);
                const exists = config.api.profiles.exists("vegetable");
                expect(exists).toEqual(false);
            });
            it("should return second layer profile does not exist", async () => {
                const config = await Config.load(MY_APP);
                const exists = config.api.profiles.exists("vegetable.potato");
                expect(exists).toEqual(false);
            });
            it("should return second layer profile does not exist even if first layer does", async () => {
                const config = await Config.load(MY_APP);
                const exists = config.api.profiles.exists("fruit.mango");
                expect(exists).toEqual(false);
            });
        });
        describe("defaultSet", () => {
            it("should set the default profile", async () => {
                const config = await Config.load(MY_APP);
                config.api.profiles.defaultSet("fruit", "fruit");
                const defaultProfile = config.properties.defaults.fruit;
                expect(defaultProfile).toEqual("fruit");
            });
            it("should set the default profile to one that does not exist", async () => {
                const config = await Config.load(MY_APP);
                config.api.profiles.defaultSet("fruit", "vegetable");
                const defaultProfile = config.properties.defaults.fruit;
                expect(defaultProfile).toEqual("vegetable");
            });
        });
        describe("defaultGet", () => {
            it("should get the default profile", async () => {
                const config = await Config.load(MY_APP);
                const profile = config.api.profiles.defaultGet("fruit");
                const profileExpected: any = {
                    origin: "California",
                    color: "red"
                };
                expect(profile).toMatchSnapshot();
                expect(profile).toEqual(profileExpected);
            });
            it("should return null if there is no default profile", async () => {
                const config = await Config.load(MY_APP);
                const profile = config.api.profiles.defaultGet("vegetable");
                expect(profile).toBeNull();
            });
        });
        describe("load", () => {
            it("should get a first level profile", async () => {
                const config = await Config.load(MY_APP);
                const profile = config.api.profiles.load("fruit");
                expect(profile).toMatchSnapshot();
                expect(profile.properties.origin.value).toEqual("California");
            });
            it("should get a second level profile", async () => {
                const config = await Config.load(MY_APP);
                const profile = config.api.profiles.load("fruit.apple");
                expect(profile).toMatchSnapshot();
                expect(profile.properties.color.value).toEqual("red");
                expect(profile.properties.origin).toBeUndefined();
            });
            it("should fail to get a profile that doesn't exist", async () => {
                const config = await Config.load(MY_APP);
                const profile = config.api.profiles.load("vegetable");
                expect(profile).toBeNull();
            });
            it("should merge properties between project and user layers", async () => {
                const config = await Config.load(MY_APP);
                config.api.layers.activate(false, false);
                config.set("profiles.fruit.properties.origin", "Mexico");
                config.set("profiles.fruit.properties.tags", ["sweet"]);
                const profile = config.api.profiles.load("fruit");
                expect(profile.properties.origin).toEqual({ value: "California", secure: false, user: true, global: false });
                expect(profile.properties.tags).toEqual([{ value: "sweet", secure: false, user: false, global: false }]);
            });
            it("should skip loading properties that are inactive", async () => {
                const config = await Config.load(MY_APP);
                config.api.layers.activate(false, true);
                config.set("profiles.fruit.properties.tags", ["sweet"]);
                const profile = config.api.profiles.load("fruit");
                expect(profile.properties.origin).toEqual({ value: "California", secure: false, user: true, global: false });
                expect(profile.properties.tags).toBeUndefined();
            });
            it("should include secure properties with no value defined", async () => {
                const config = await Config.load(MY_APP);
                (config as any).layerActive().properties.secure.push("profiles.fruit.properties.secret");
                const profile = config.api.profiles.load("fruit");
                expect(profile.properties.origin.value).toEqual("California");
                expect(profile.properties.secret.secure).toBe(true);
            });
        });
    });
    describe("plugins", () => {
        describe("get", () => {
            it("should get the plugins", async () => {
                const config = await Config.load(MY_APP);
                const plugins: string[] = config.api.plugins.get();
                const expectedPlugins: string[] = ["@zowe/fruit-for-imperative"];
                expect(plugins).toMatchSnapshot();
                expect(plugins).toEqual(expectedPlugins);
            });
        });
    });
    describe("layers", () => {
        describe("write", () => {
            it("should save the active config layer", async () => {
                jest.spyOn(Config.prototype as any, "secureSave").mockResolvedValueOnce(undefined);
                const writeFileSpy = jest.spyOn(fs, "writeFileSync").mockReturnValueOnce(undefined);
                const config = await Config.load(MY_APP);
                await config.api.layers.write();
                expect(writeFileSpy).toHaveBeenCalled();
                expect(writeFileSpy.mock.calls[0][1]).toMatchSnapshot();
            });
        });
        describe("activate", () => {
            const filePathProjectConfig = path.join(__dirname, "__resources__", "project.config.json");
            const filePathProjectUserConfig = path.join(__dirname, "__resources__", "project.config.user.json");
            const filePathAppConfig = path.join(__dirname, "__resources__", "my_app.config.json");
            const filePathAppUserConfig = path.join(__dirname, "__resources__", "my_app.config.user.json");
            beforeEach(() => {
                jest.restoreAllMocks();
                jest.spyOn(Config, "search").mockReturnValueOnce(filePathProjectUserConfig)
                                            .mockReturnValueOnce(filePathProjectConfig);
                jest.spyOn(path, "join").mockReturnValueOnce(filePathAppUserConfig)
                                        .mockReturnValueOnce(filePathAppUserConfig)
                                        .mockReturnValueOnce(filePathAppConfig)
                                        .mockReturnValueOnce(filePathAppConfig);
                jest.spyOn(Config.prototype as any, "secureLoad").mockResolvedValue(undefined);
            });
            it("should activate the project configuration", async () => {
                const config = await Config.load(MY_APP);
                config.api.layers.activate(false, false);
                const properties = config.api.layers.get()
                const filePath = filePathProjectConfig;
                const fileContents = fs.readFileSync(filePath).toString()
                expect(properties.user).toBe(false);
                expect(properties.global).toBe(false);
                expect(properties.exists).toBe(true);
                expect(properties.path).toEqual(filePath);
                expect(properties.properties.defaults).toEqual(JSON.parse(fileContents).defaults);
                expect(properties.properties.plugins).toEqual(JSON.parse(fileContents).plugins);
                expect(properties.properties.profiles).toEqual(JSON.parse(fileContents).profiles);
                expect(properties.properties.secure).toEqual(JSON.parse(fileContents).secure);
            });
            it("should activate the project user configuration", async () => {
                const config = await Config.load(MY_APP);
                config.api.layers.activate(true, false);
                const properties = config.api.layers.get()
                const filePath = filePathProjectUserConfig;
                const fileContents = fs.readFileSync(filePath).toString()
                expect(properties.user).toBe(true);
                expect(properties.global).toBe(false);
                expect(properties.exists).toBe(true);
                expect(properties.path).toEqual(filePath);
                expect(properties.properties.defaults).toEqual(JSON.parse(fileContents).defaults);
                expect(properties.properties.plugins).toEqual(JSON.parse(fileContents).plugins);
                expect(properties.properties.profiles).toEqual(JSON.parse(fileContents).profiles);
            });
            it("should activate the global configuration", async () => {
                const config = await Config.load(MY_APP);
                config.api.layers.activate(false, true);
                const properties = config.api.layers.get()
                const filePath = filePathAppConfig;
                const fileContents = fs.readFileSync(filePath).toString()
                expect(properties.user).toBe(false);
                expect(properties.global).toBe(true);
                expect(properties.exists).toBe(true);
                expect(properties.path).toEqual(filePath);
                expect(properties.properties.defaults).toEqual(JSON.parse(fileContents).defaults);
                expect(properties.properties.plugins).toEqual(JSON.parse(fileContents).plugins);
                expect(properties.properties.profiles).toEqual(JSON.parse(fileContents).profiles);
                expect(properties.properties.secure).toEqual(JSON.parse(fileContents).secure);
            });
            it("should activate the global user configuration", async () => {
                const config = await Config.load(MY_APP);
                config.api.layers.activate(true, true);
                const properties = config.api.layers.get()
                const filePath = filePathAppUserConfig;
                const fileContents = fs.readFileSync(filePath).toString()
                expect(properties.user).toBe(true);
                expect(properties.global).toBe(true);
                expect(properties.exists).toBe(true);
                expect(properties.path).toEqual(filePath);
                expect(properties.properties.defaults).toEqual(JSON.parse(fileContents).defaults);
                expect(properties.properties.plugins).toEqual(JSON.parse(fileContents).plugins);
                expect(properties.properties.profiles).toEqual(JSON.parse(fileContents).profiles);
                expect(properties.properties.secure).toEqual(JSON.parse(fileContents).secure);
            });
        });
        describe("get", () => {
            it("should get the active layer", async () => {
                const config = await Config.load(MY_APP);
                const layer = config.api.layers.get();
                layer.path = path.basename(layer.path); // Everyone has a different path.
                expect(layer).toMatchSnapshot();
                expect(layer.properties).toEqual(config.properties);
            });
        });
        describe("set", () => {
            it("should set the current layer", async () => {
                const config = await Config.load(MY_APP);
                const cnfg: IConfig = {
                    $schema: "fake",
                    defaults: {},
                    plugins: [],
                    secure: [],
                    profiles: {
                        vegetable: {
                            properties: {
                                origin: "California",
                                color: "brown"
                            }
                        }
                    }
                };
                config.api.layers.set(cnfg);
                const retrievedConfig = config.api.layers.get().properties;
                expect(retrievedConfig).toMatchSnapshot();
                expect(retrievedConfig).toEqual(cnfg);
            });

            it("should set the current layer when nothing is provided", async () => {
                const config = await Config.load(MY_APP);
                const cnfg: IConfig = {
                    $schema: undefined,
                    defaults: undefined,
                    plugins: undefined,
                    secure: undefined,
                    profiles: undefined
                };
                config.api.layers.set(cnfg);
                const retrievedConfig = config.api.layers.get().properties;
                expect(retrievedConfig).toMatchSnapshot();
                expect(retrievedConfig.defaults).toEqual({});
                expect(retrievedConfig.profiles).toEqual({});
                expect(retrievedConfig.plugins).toEqual([]);
                expect(retrievedConfig.secure).toEqual([]);
            });
        });
        describe("merge", () => {
            it("should merge config layers with correct priority", async () => {
                const config = await Config.load(MY_APP);
                config.api.layers.merge(mergeConfig);
                const retrievedConfig = (config as any).layerActive().properties;
                expect(retrievedConfig).toMatchSnapshot();

                // Check that new config was added
                expect(retrievedConfig.plugins.length).toBe(2);
                expect(retrievedConfig.profiles.fruit.profiles.grape).toBeDefined();
                expect(retrievedConfig.profiles.fruit.properties.shipDate).toBeDefined();
                expect(retrievedConfig.secure.length).toBe(1);

                // Check that old config had priority
                expect(retrievedConfig.defaults.fruit).toBe("fruit.apple");
                expect(retrievedConfig.profiles.fruit.profiles.apple.properties.color).toBe("red");
                expect(retrievedConfig.profiles.fruit.profiles.orange).toBeDefined();
                expect(retrievedConfig.profiles.fruit.properties.origin).toBe("California");
            });
        });
    });
});
