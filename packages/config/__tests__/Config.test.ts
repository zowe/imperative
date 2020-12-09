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
import * as os from "os";
import * as path from "path";
import { ImperativeError } from "../..";
import { Config } from "../src/Config";
import * as JSONC from "comment-json";

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
            jest.spyOn(fs, "existsSync")
                .mockReturnValueOnce(false)     // Project user layer
                .mockReturnValueOnce(false)     // Project layer
                .mockReturnValueOnce(true)      // User layer
                .mockReturnValueOnce(false);    // Global layer
            const config = await Config.load(MY_APP, { homeDir: __dirname + "/__resources__" });
            expect(config.properties).toMatchSnapshot();
        });

        it("should load global config", async () => {
            jest.spyOn(Config, "search").mockReturnValue(null);
            jest.spyOn(fs, "existsSync")
                .mockReturnValueOnce(false)     // Project user layer
                .mockReturnValueOnce(false)     // Project layer
                .mockReturnValueOnce(false)     // User layer
                .mockReturnValueOnce(true);     // Global layer
            const config = await Config.load(MY_APP, { homeDir: __dirname + "/__resources__" });
            expect(config.properties).toMatchSnapshot();
        });

        it("should merge multiple config files", async () => {
            jest.spyOn(Config, "search")
                .mockReturnValueOnce(__dirname + "/__resources__/project.config.user.json")
                .mockReturnValueOnce(__dirname + "/__resources__/project.config.json");
            jest.spyOn(fs, "existsSync").mockReturnValue(true);
            const config = await Config.load(MY_APP, { homeDir: __dirname + "/__resources__" });
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
            try {
                await Config.load(MY_APP);
            } catch (err) {
                error = err;
            }
            expect(error).toBeDefined();
            expect(error.message).toContain("error reading config file");
            expect(error.message).toContain(__dirname + "/__resources__");
            expect(error instanceof ImperativeError).toBe(true);
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

    describe("set (with comments)", () => {
        const blockComment = "/* block-comment */";
        const lineComment = "// line-comment";
        beforeEach(() => {
            jest.spyOn(Config, "search").mockReturnValue(__dirname + "/__resources__/commented-project.config.user.json");
            jest.spyOn(fs, "existsSync").mockReturnValueOnce(true).mockReturnValue(false);
            jest.spyOn(Config.prototype as any, "secureLoad").mockResolvedValue(undefined);
        });

        it("should set boolean true in config", async () => {
            const config = await Config.load(MY_APP);
            config.set("profiles.fruit.profiles.apple.properties.ripe", "true");
            expect(config.properties.profiles.fruit.profiles.apple.properties.ripe).toBe(true);

            const layer = config.api.layers.get();
            expect(JSONC.stringify(layer.properties.profiles.fruit.profiles.apple.properties.ripe, null, Config.INDENT)).toContain(blockComment);
            expect(JSONC.stringify(layer.properties.profiles.fruit.profiles.apple.properties.ripe, null, Config.INDENT)).toContain(lineComment);
        });

        it("should set boolean false in config", async () => {
            const config = await Config.load(MY_APP);
            config.set("profiles.fruit.profiles.apple.properties.ripe", "false");
            expect(config.properties.profiles.fruit.profiles.apple.properties.ripe).toBe(false);

            const layer = config.api.layers.get();
            expect(JSONC.stringify(layer.properties.profiles.fruit.profiles.apple.properties.ripe, null, Config.INDENT)).toContain(blockComment);
            expect(JSONC.stringify(layer.properties.profiles.fruit.profiles.apple.properties.ripe, null, Config.INDENT)).toContain(lineComment);
        });

        it("should set integer value in config", async () => {
            const config = await Config.load(MY_APP);
            config.set("profiles.fruit.profiles.apple.properties.price", "2");
            expect(config.properties.profiles.fruit.profiles.apple.properties.price).toBe(2);

            const layer = config.api.layers.get();
            expect(JSONC.stringify(layer.properties.profiles.fruit.profiles.apple.properties.price, null, Config.INDENT)).toContain(blockComment);
            expect(JSONC.stringify(layer.properties.profiles.fruit.profiles.apple.properties.price, null, Config.INDENT)).toContain(lineComment);
        });

        it("should append to array value in config", async () => {
            const config = await Config.load(MY_APP);
            // config.set("profiles.fruit.properties.tags", []);
            config.set("profiles.fruit.properties.tags", "sweet");
            expect(config.properties.profiles.fruit.properties.tags.length).toBe(1);
            expect(config.properties.profiles.fruit.properties.tags[0]).toBe("sweet");

            const layer = config.api.layers.get();
            expect(JSONC.stringify(layer.properties.profiles.fruit.properties.tags, null, Config.INDENT)).toContain(blockComment);
            expect(JSONC.stringify(layer.properties.profiles.fruit.properties.tags, null, Config.INDENT)).toContain(lineComment);
        });

        it("should set secure string value in config", async () => {
            const config = await Config.load(MY_APP);
            const layer = (config as any).layerActive();
            layer.path = path.basename(layer.path); // Everyone has a different path.

            config.set("profiles.fruit.profiles.apple.properties.secret", "@ppl3", { secure: true });

            expect(config.properties.profiles.fruit.profiles.apple.properties.secret).toBe("@ppl3");
            expect(layer.properties.secure.length).toBe(1);
            expect(layer.properties.secure[0]).toBe("profiles.fruit.profiles.apple.properties.secret");

            expect(JSONC.stringify(layer.properties.secure, null, Config.INDENT)).toContain(blockComment);
            expect(JSONC.stringify(layer.properties.secure, null, Config.INDENT)).toContain(lineComment);
        });

        it("should set schema URI at top of config", async () => {
            const config = await Config.load(MY_APP);
            const layer = (config as any).layerActive();
            config.setSchema("./schema.json");
            const jsonText = JSONC.stringify(layer.properties);
            expect(jsonText.match(/^{\s*"\$schema":/)).not.toBeNull();

            expect(JSONC.stringify(layer.properties.$schema, null, Config.INDENT)).toContain(blockComment);
            expect(JSONC.stringify(layer.properties.$schema, null, Config.INDENT)).toContain(lineComment);
        });

        // it("should save schema to disk if object is provided", async () => {
        //     const writeFileSpy = jest.spyOn(fs, "writeFileSync").mockReturnValue(undefined);
        //     const config = await Config.load(MY_APP);
        //     const schemaObj = { $schema: "./schema.json" };
        //     config.setSchema(schemaObj.$schema, schemaObj);
        //     expect(writeFileSpy).toHaveBeenCalledTimes(1);
        //     const jsonText = writeFileSpy.mock.calls[0][1];
        //     expect(jsonText).toBeDefined();
        //     expect(jsonText.match(/^{\s*"\$schema":/)).not.toBeNull();
        // });

        // it("should add new secure property to config", async () => {
        //     const config = await Config.load(MY_APP);
        //     const layer = (config as any).layerActive();
        //     const secureProp = "profiles.fruit.properties.secret";
        //     config.addSecure(secureProp);
        //     expect(layer.properties.secure.includes(secureProp)).toBe(true);
        //     config.addSecure(secureProp);
        //     expect(layer.properties.secure.filter((x: any) => x === secureProp).length).toBe(1);
        // });

        // it("should add a new layer when one is specified in the set", async () => {
        //     const config = await Config.load(MY_APP);
        //     config.set("profiles.fruit.profiles.mango.properties.color", "orange");
        //     expect(config.properties.profiles.fruit.profiles.mango.properties.color).toBe("orange");
        //     expect (config.properties.profiles).toMatchSnapshot();
        // });
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
        const parsedPath = path.parse(__dirname);
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
        it("should search for and not return file in the parent directory because the parent directory is the global directory", async () => {
            const joinedPath = path.join(configDir, configFile);
            const notExpectedPath = path.join(path.resolve(configDir, ".."), configFile);
            const expectedPath = path.join(path.resolve(configDir, "..", ".."), configFile);
            jest.spyOn(fs, "existsSync").mockReturnValueOnce(false).mockReturnValue(true);
            jest.spyOn(path, "join").mockReturnValue(joinedPath);
            const file = Config.search(configFile, { stop: home, gbl: path.resolve(configDir, "..") });
            expect(file).not.toBe(notExpectedPath);
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
            jest.spyOn(path, "parse").mockReturnValueOnce(parsedPath);
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
