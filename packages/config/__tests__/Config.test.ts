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
import * as os from "os";
import { ImperativeError } from "../..";
import { Config } from "../src/Config";
import { IConfig } from "../src/doc/IConfig";
import { IConfigProfile } from "../src/doc/IConfigProfile";

const MY_APP = "my_app";

describe("Config tests", () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("load", () => {
        beforeEach(() => {
            jest.spyOn(Config.prototype as any, "secureLoad").mockResolvedValue(undefined);
        });

        it("should load project user config", async () => {
            jest.spyOn(Config, "search").mockReturnValue(__dirname + "/__resources__/project.config.user.json");
            jest.spyOn(fs, "existsSync")
                .mockReturnValueOnce(true)      // Project user layer
                .mockReturnValueOnce(false)     // Project layer
                .mockReturnValueOnce(false)     // User layer
                .mockReturnValueOnce(false);    // Global layer
            const config = await Config.load(MY_APP);
            expect(config.properties).toMatchSnapshot();
        });

        it("should load project config", async () => {
            jest.spyOn(Config, "search").mockReturnValue(__dirname + "/__resources__/project.config.json");
            jest.spyOn(fs, "existsSync")
                .mockReturnValueOnce(false)     // Project user layer
                .mockReturnValueOnce(true)      // Project layer
                .mockReturnValueOnce(false)     // User layer
                .mockReturnValueOnce(false);    // Global layer
            const config = await Config.load(MY_APP);
            expect(config.properties).toMatchSnapshot();
        });

        it("should load user config", async () => {
            jest.spyOn(Config, "search").mockReturnValue(null);
            jest.spyOn(Config.prototype as any, "_home", "get").mockReturnValue(__dirname + "/__resources__");
            jest.spyOn(fs, "existsSync")
                .mockReturnValueOnce(false)     // Project user layer
                .mockReturnValueOnce(false)     // Project layer
                .mockReturnValueOnce(true)      // User layer
                .mockReturnValueOnce(false);    // Global layer
            const config = await Config.load(MY_APP);
            expect(config.properties).toMatchSnapshot();
        });

        it("should load global config", async () => {
            jest.spyOn(Config, "search").mockReturnValue(null);
            jest.spyOn(Config.prototype as any, "_home", "get").mockReturnValue(__dirname + "/__resources__");
            jest.spyOn(fs, "existsSync")
                .mockReturnValueOnce(false)     // Project user layer
                .mockReturnValueOnce(false)     // Project layer
                .mockReturnValueOnce(false)     // User layer
                .mockReturnValueOnce(true);     // Global layer
            const config = await Config.load(MY_APP);
            expect(config.properties).toMatchSnapshot();
        });

        it("should merge multiple config files", async () => {
            jest.spyOn(Config, "search")
                .mockReturnValueOnce(__dirname + "/__resources__/project.config.user.json")
                .mockReturnValueOnce(__dirname + "/__resources__/project.config.json");
            jest.spyOn(Config.prototype as any, "_home", "get").mockReturnValue(__dirname + "/__resources__");
            jest.spyOn(fs, "existsSync").mockReturnValue(true);
            const config = await Config.load(MY_APP);
            expect(config.properties).toMatchSnapshot();
        });

        it("should load a config and populate missing defaults", async () => {
            jest.spyOn(Config, "search").mockReturnValue(__dirname + "/__resources__/project.config.json");
            jest.spyOn(fs, "existsSync")
                .mockReturnValueOnce(false)     // Project user layer
                .mockReturnValueOnce(true)      // Project layer
                .mockReturnValueOnce(false)     // User layer
                .mockReturnValueOnce(false);    // Global layer
            jest.spyOn(fs, "readFileSync").mockReturnValueOnce("{}");
            const config = await Config.load(MY_APP);
            expect(config.properties).toMatchSnapshot();
            expect(config.properties.defaults).toEqual({});
            expect(config.properties.profiles).toEqual({});
            expect(config.properties.plugins).toEqual([]);
            expect(config.properties.secure).toEqual([]);
        });

        it("should fail to load config that is not JSON", async () => {
            jest.spyOn(Config, "search").mockReturnValue(__dirname + "/__resources__/project.config.json");
            jest.spyOn(fs, "existsSync")
                .mockReturnValueOnce(false)     // Project user layer
                .mockReturnValueOnce(true)      // Project layer
                .mockReturnValueOnce(false)     // User layer
                .mockReturnValueOnce(false);    // Global layer
            jest.spyOn(fs, "readFileSync").mockReturnValueOnce("This is not JSON");
            let error: any;
            let config: any;
            try {
                config = await Config.load(MY_APP);
            } catch (err) {
                error = err;
            }
            expect(error).toBeDefined();
            expect(error.message).toContain("error reading config file");
            expect(error.message).toContain(__dirname + "/__resources__");
            expect(error instanceof ImperativeError).toBe(true);
            expect(error).toMatchSnapshot();
        });
    });

    it("should find config that exists if any layers exist", () => {
        const config = new (Config as any)();
        config._layers = [
            { exists: false },
            { exists: true },
            { exists: false }
        ];
        expect(config.exists).toBe(true);
    });

    it("should not find config that exists if no layers exist", () => {
        const config = new (Config as any)();
        config._layers = [ { exists: false } ];
        expect(config.exists).toBe(false);
    });

    it("should provide a deep copy of layers", () => {
        const config = new (Config as any)();
        config._layers = {};
        config.layers.properties = {};
        expect(Object.keys(config._layers).length).toBe(0);
    });

    describe("set", () => {
        beforeEach(() => {
            jest.spyOn(Config, "search").mockReturnValue(__dirname + "/__resources__/project.config.user.json");
            jest.spyOn(fs, "existsSync").mockReturnValueOnce(true).mockReturnValue(false);
            jest.spyOn(Config.prototype as any, "secureLoad").mockResolvedValue(undefined);
        });

        it("should set boolean true in config", async () => {
            const config = await Config.load(MY_APP);
            config.set("profiles.fruit.profiles.apple.properties.ripe", "true");
            expect(config.properties.profiles.fruit.profiles.apple.properties.ripe).toBe(true);
        });

        it("should set boolean false in config", async () => {
            const config = await Config.load(MY_APP);
            config.set("profiles.fruit.profiles.apple.properties.ripe", "false");
            expect(config.properties.profiles.fruit.profiles.apple.properties.ripe).toBe(false);
        });

        it("should set integer value in config", async () => {
            const config = await Config.load(MY_APP);
            config.set("profiles.fruit.profiles.apple.properties.price", "2");
            expect(config.properties.profiles.fruit.profiles.apple.properties.price).toBe(2);
        });

        it("should append to array value in config", async () => {
            const config = await Config.load(MY_APP);
            config.set("profiles.fruit.properties.tags", []);
            config.set("profiles.fruit.properties.tags", "sweet");
            expect(config.properties.profiles.fruit.properties.tags.length).toBe(1);
            expect(config.properties.profiles.fruit.properties.tags[0]).toBe("sweet");
        });

        it("should set secure string value in config", async () => {
            const config = await Config.load(MY_APP);
            const layer = (config as any).layerActive();
            config.set("profiles.fruit.profiles.apple.properties.secret", "@ppl3", { secure: true });
            expect(config.properties.profiles.fruit.profiles.apple.properties.secret).toBe("@ppl3");
            expect(layer.properties.secure.length).toBe(1);
            expect(layer.properties.secure[0]).toBe("profiles.fruit.profiles.apple.properties.secret");
        });

        it("should set schema URI at top of config", async () => {
            const config = await Config.load(MY_APP);
            const layer = (config as any).layerActive();
            config.setSchema("./schema.json");
            const jsonText = JSON.stringify(layer.properties);
            expect(jsonText.match(/^{\s*"\$schema":/)).not.toBeNull();
        });

        it("should save schema to disk if object is provided", async () => {
            const writeFileSpy = jest.spyOn(fs, "writeFileSync").mockReturnValue(undefined);
            const config = await Config.load(MY_APP);
            const schemaObj = { $schema: "./schema.json" };
            config.setSchema(schemaObj.$schema, schemaObj);
            expect(writeFileSpy).toHaveBeenCalledTimes(1);
            const jsonText = writeFileSpy.mock.calls[0][1];
            expect(jsonText).toBeDefined();
            expect(jsonText.match(/^{\s*"\$schema":/)).not.toBeNull();
        });

        it("should add new secure property to config", async () => {
            const config = await Config.load(MY_APP);
            const layer = (config as any).layerActive();
            const secureProp = "profiles.fruit.properties.secret";
            config.addSecure(secureProp);
            expect(layer.properties.secure.includes(secureProp)).toBe(true);
            config.addSecure(secureProp);
            expect(layer.properties.secure.filter((x: any) => x === secureProp).length).toBe(1);
        });

        it("should add a new layer when one is specified in the set", async () => {
            const config = await Config.load(MY_APP);
            config.set("profiles.fruit.profiles.mango.properties.color", "orange");
            expect(config.properties.profiles.fruit.profiles.mango.properties.color).toBe("orange");
            expect (config.properties.profiles).toMatchSnapshot();
        });
    });

    describe("secure", () => {
        it("should securely load all secure properties", async () => {
            throw new Error("TODO");
        });

        it("should securely save all secure properties", async () => {
            throw new Error("TODO");
        });
    });

    it("should find secure properties if any exist", () => {
        const config = new (Config as any)();
        config._layers = [
            {
                properties: { secure: [] }
            },
            {
                properties: { secure: [ "tokenValue" ] }
            },
            {
                properties: { secure: [] }
            }
        ];
        expect(config.secureFields()).toBe(true);
    });

    it("should not find secure properties if none exist", () => {
        const config = new (Config as any)();
        config._layers = [
            {
                properties: { secure: [] }
            }
        ];
        expect(config.secureFields()).toBe(false);
    });

    describe("api", () => {
        beforeEach(() => {
            jest.spyOn(Config, "search").mockReturnValue(__dirname + "/__resources__/project.config.user.json");
            jest.spyOn(fs, "existsSync").mockReturnValueOnce(true).mockReturnValue(false);
            jest.spyOn(Config.prototype as any, "secureLoad").mockResolvedValue(undefined);
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
                })
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
        //     describe("write", () => {

        //     });
            describe("activate", () => {
                const filePathProjectConfig = path.join(__dirname, "__resources__", "project.config.json");
                const filePathProjectUserConfig = path.join(__dirname, "__resources__", "project.config.user.json");
                const filePathAppConfig = path.join(__dirname, "__resources__", "my_app.config.json");
                const filePathAppUserConfig = path.join(__dirname, "__resources__", "my_app.config.user.json");
                beforeEach(() => {
                    jest.restoreAllMocks();
                    jest.spyOn(Config, "search").mockReturnValueOnce(__dirname + "/__resources__/project.config.user.json")
                                                .mockReturnValueOnce(__dirname + "/__resources__/project.config.json");
                    jest.spyOn(path, "join").mockReturnValueOnce(__dirname + "/__resources__/my_app.config.user.json")
                                            .mockReturnValueOnce(__dirname + "/__resources__/my_app.config.user.json")
                                            .mockReturnValueOnce(__dirname + "/__resources__/my_app.config.json")
                                            .mockReturnValueOnce(__dirname + "/__resources__/my_app.config.json");
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
                    console.log(properties);
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
                    console.log(properties);
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
        });
    });
    describe("paths", () => {
        beforeEach(() => {
            jest.spyOn(Config, "search").mockReturnValue(__dirname + "/__resources__/project.config.user.json");
            jest.spyOn(fs, "existsSync").mockReturnValueOnce(true).mockReturnValue(false);
            jest.spyOn(Config.prototype as any, "secureLoad").mockResolvedValue(undefined);
        });
        it("should get paths", async () => {
            const config = await Config.load(MY_APP);
            const paths: string[] = config.paths;
            const expectedPath: string = __dirname + "/__resources__/project.config.user.json";
            expect(paths).toContain(expectedPath);
        });
    });
    describe("search", () => {
        const home = os.homedir();
        const configFile = "project.config.user.json";
        const configDir = path.join(__dirname, "__resources__");
        const fakeConfigDir = path.join(__dirname, configFile);
        it("should search for a file in the same directory", async () => {
            const joinedPath = path.join(configDir, configFile);
            const expectedPath = path.join(path.resolve(configDir), configFile);
            jest.spyOn(fs, "existsSync").mockReturnValue(true);
            jest.spyOn(path, "join").mockReturnValue(joinedPath);
            const file = Config.search(configFile, { stop: home });
            expect(file).toBe(expectedPath);
        });
        it("should search for a file in the parent directory", async () => {
            const joinedPath = path.join(configDir, configFile);
            const expectedPath = path.join(path.resolve(configDir, ".."), configFile);
            jest.spyOn(fs, "existsSync").mockReturnValueOnce(false).mockReturnValue(true);
            jest.spyOn(path, "join").mockReturnValue(joinedPath);
            const file = Config.search(configFile, { stop: home });
            expect(file).toBe(expectedPath);
        });
        it("should fail to find a file", async () => {
            const joinedPath = path.join(configDir, configFile);
            jest.spyOn(fs, "existsSync").mockReturnValue(false);
            jest.spyOn(path, "join").mockReturnValue(joinedPath);
            const file = Config.search(configFile, { stop: home });
            expect(file).toBe(null);
        });
        it("should search for and find a file without opts", async () => {
            const joinedPath = path.join(configDir, configFile);
            const expectedPath = path.join(path.resolve(configDir), configFile);
            jest.spyOn(fs, "existsSync").mockReturnValue(true);
            jest.spyOn(path, "join").mockReturnValue(joinedPath);
            const file = Config.search(configFile);
            expect(file).toBe(expectedPath);
        });
        it("should search for and fail to find a file without opts", async () => {
            const joinedPath = path.join(configDir, configFile);
            jest.spyOn(fs, "existsSync").mockReturnValue(false);
            jest.spyOn(path, "join").mockReturnValue(joinedPath);
            const file = Config.search(configFile, { stop: home });
            expect(file).toBe(null);
        });
        it("should throw an error if the previously searched directory is the same is the current", async () => {
            const joinedPath = path.join(configDir, configFile);
            let error;
            jest.spyOn(fs, "existsSync").mockReturnValue(false);
            jest.spyOn(path, "join").mockReturnValueOnce(joinedPath).mockReturnValue(fakeConfigDir);
            jest.spyOn(path, "resolve").mockReturnValue(joinedPath);
            jest.spyOn(path, "parse").mockReturnValueOnce(__dirname);
            try {
                Config.search(configFile, { stop: home });
            } catch (err) {
                error = err;
            }
            expect(error).toBeDefined();
            expect(error.message).toContain("internal search error");
        });
    });
});
