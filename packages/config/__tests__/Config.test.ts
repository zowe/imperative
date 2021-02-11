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
import * as findUp from "find-up";
import { ImperativeError } from "../..";
import { Config } from "../src/Config";
import { ConfigConstants } from "../src/ConfigConstants";
import * as JSONC from "comment-json";
import { ConfigSecure } from "../src/api";

const MY_APP = "my_app";

describe("Config tests", () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("load", () => {
        beforeEach(() => {
            jest.spyOn(ConfigSecure.prototype, "load").mockResolvedValue(undefined);
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

        it("should form the full path to the config file", async () => {
            const actualConfigPathNm = __dirname + "/__resources__/project.config.json";
            jest.spyOn(Config, "search").mockReturnValue(actualConfigPathNm);
            jest.spyOn(fs, "existsSync")
                .mockReturnValueOnce(false)     // Project user layer
                .mockReturnValueOnce(true)      // Project layer
                .mockReturnValueOnce(false)     // User layer
                .mockReturnValueOnce(false);    // Global layer
            const config = await Config.load(MY_APP);
            const formedConfigPathNm = config.formMainConfigPathNm({addPath: true});
            expect(formedConfigPathNm).toBe(actualConfigPathNm);
        });

        it("should form the just the config file name", async () => {
            const actualConfigFileNm = MY_APP + ".config.json";
            const actualConfigPathNm = __dirname + "/__resources__/" + actualConfigFileNm;
            jest.spyOn(Config, "search").mockReturnValue(actualConfigPathNm);
            jest.spyOn(fs, "existsSync")
                .mockReturnValueOnce(false)     // Project user layer
                .mockReturnValueOnce(true)      // Project layer
                .mockReturnValueOnce(false)     // User layer
                .mockReturnValueOnce(false);    // Global layer
            const config = await Config.load(MY_APP);
            const formedConfigFileNm = config.formMainConfigPathNm({addPath: false});
            expect(formedConfigFileNm).toBe(actualConfigFileNm);
        });

        it("should form the just the config file name when no config exists", async () => {
            const actualConfigFileNm = MY_APP + ".config.json";
            const actualConfigPathNm = __dirname + "/__resources__/" + actualConfigFileNm;
            jest.spyOn(Config, "search").mockReturnValue(actualConfigPathNm);
            jest.spyOn(fs, "existsSync")
                .mockReturnValueOnce(false)     // Project user layer
                .mockReturnValueOnce(true)      // Project layer
                .mockReturnValueOnce(false)     // User layer
                .mockReturnValueOnce(false);    // Global layer
            const config = new (Config as any)();
            config.mApp = MY_APP;
            config.mLayers = [ { exists: false } ];

            const formedConfigFileNm = config.formMainConfigPathNm({addPath: true});
            expect(formedConfigFileNm).toBe(actualConfigFileNm);
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
            expect(error.message).toContain("Error parsing JSON in the file");
            expect(error.message).toContain(__dirname + "/__resources__");
            expect(error.message).toContain("Line 1, Column 0");
            expect(error instanceof ImperativeError).toBe(true);
            expect(error.suppressDump).toBe(true);
        });

        it("should fail to load config that seems to exist but doesn't", async () => {
            jest.spyOn(Config, "search").mockReturnValue(__dirname + "/__resources__/fakeproject.config.json");
            jest.spyOn(fs, "existsSync")
                .mockReturnValueOnce(false)     // Project user layer
                .mockReturnValueOnce(true)      // Project layer
                .mockReturnValueOnce(false)     // User layer
                .mockReturnValueOnce(false);    // Global layer
            jest.spyOn(fs, "readFileSync")
            let error: any;
            try {
                await Config.load(MY_APP);
            } catch (err) {
                error = err;
            }
            expect(error).toBeDefined();
            expect(error.message).toContain("An error was encountered while trying to read the file");
            expect(error.message).toContain(__dirname + "/__resources__");
            expect(error instanceof ImperativeError).toBe(true);
        });
    });

    it("should return the app name", () => {
        const config = new (Config as any)();
        config.mApp = "greatAppName";
        expect(config.appName).toBe("greatAppName");
    });

    it("should find config that exists if any layers exist", () => {
        const config = new (Config as any)();
        config.mLayers = [
            { exists: false },
            { exists: true },
            { exists: false }
        ];
        expect(config.exists).toBe(true);
    });

    it("should not find config that exists if no layers exist", () => {
        const config = new (Config as any)();
        config.mLayers = [ { exists: false } ];
        expect(config.exists).toBe(false);
    });

    it("should provide a deep copy of layers", () => {
        const config = new (Config as any)();
        config.mLayers = [];
        config.layers.push({});
        expect(Object.keys(config.mLayers).length).toBe(0);
    });

    it("should make secure values in maskedProperties", async () => {
        jest.spyOn(Config, "search").mockReturnValue(__dirname + "/__resources__/project.config.json");
        jest.spyOn(fs, "existsSync")
            .mockReturnValueOnce(false)     // Project user layer
            .mockReturnValueOnce(true)      // Project layer
            .mockReturnValueOnce(false)     // User layer
            .mockReturnValueOnce(false);    // Global layer
        const config = await Config.load(MY_APP);
        expect(config.properties.profiles.fruit.properties.secret).toBeUndefined();
        expect(config.maskedProperties.profiles.fruit.properties.secret).toBe(ConfigConstants.SECURE_VALUE);
    });

    describe("set", () => {
        beforeEach(() => {
            jest.spyOn(Config, "search").mockReturnValue(__dirname + "/__resources__/project.config.user.json");
            jest.spyOn(fs, "existsSync").mockReturnValueOnce(true).mockReturnValue(false);
            jest.spyOn(ConfigSecure.prototype, "load").mockResolvedValue(undefined);
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
            const writeFileSpy = jest.spyOn(fs, "writeFileSync").mockReturnValueOnce(undefined);
            const config = await Config.load(MY_APP);
            config.setSchema({ $schema: "./schema.json" });
            expect(writeFileSpy).toHaveBeenCalledTimes(1);
            const jsonText = writeFileSpy.mock.calls[0][1];
            expect(jsonText).toBeDefined();
            expect(jsonText.match(/^{\s*"\$schema":/)).not.toBeNull();
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
            jest.spyOn(ConfigSecure.prototype, "load").mockResolvedValue(undefined);
        });

        it("should set boolean true in config", async () => {
            const config = await Config.load(MY_APP);
            config.set("profiles.fruit.profiles.apple.properties.ripe", "true");
            expect(config.properties.profiles.fruit.profiles.apple.properties.ripe).toBe(true);

            const layer = (config as any).layerActive();
            const testObj = JSONC.stringify(layer.properties.profiles.fruit.profiles.apple.properties, null, ConfigConstants.INDENT)
                .split("\n").find((item) => item.indexOf("ripe") >= 0);
            expect(testObj).toContain(blockComment);
            expect(testObj).toContain(lineComment);
        });

        it("should set boolean false in config", async () => {
            const config = await Config.load(MY_APP);
            config.set("profiles.fruit.profiles.apple.properties.ripe", "false");
            expect(config.properties.profiles.fruit.profiles.apple.properties.ripe).toBe(false);

            const layer = (config as any).layerActive();
            const testObj = JSONC.stringify(layer.properties.profiles.fruit.profiles.apple.properties, null, ConfigConstants.INDENT)
                .split("\n").find((item) => item.indexOf("ripe") >= 0);
            expect(testObj).toContain(blockComment);
            expect(testObj).toContain(lineComment);
        });

        it("should set integer value in config", async () => {
            const config = await Config.load(MY_APP);
            config.set("profiles.fruit.profiles.apple.properties.price", "2");
            expect(config.properties.profiles.fruit.profiles.apple.properties.price).toBe(2);

            const layer = (config as any).layerActive();
            const testObj = JSONC.stringify(layer.properties.profiles.fruit.profiles.apple.properties, null, ConfigConstants.INDENT)
                .split("\n").find((item) => item.indexOf("price") >= 0);
            expect(testObj).toContain(blockComment);
            expect(testObj).toContain(lineComment);
        });

        it("should append to array value in config", async () => {
            const config = await Config.load(MY_APP);
            // config.set("profiles.fruit.properties.tags", []);
            config.set("profiles.fruit.properties.tags", "sweet");
            expect(config.properties.profiles.fruit.properties.tags.length).toBe(1);
            expect(config.properties.profiles.fruit.properties.tags[0]).toBe("sweet");

            const layer = (config as any).layerActive();
            expect(JSONC.stringify(layer.properties.profiles.fruit.properties.tags, null, ConfigConstants.INDENT)).toContain(blockComment);
            expect(JSONC.stringify(layer.properties.profiles.fruit.properties.tags, null, ConfigConstants.INDENT)).toContain(lineComment);
        });

        it("should set secure string value in config", async () => {
            const config = await Config.load(MY_APP);
            const layer = (config as any).layerActive();
            layer.path = path.basename(layer.path); // Everyone has a different path.

            config.set("profiles.fruit.profiles.apple.properties.secret", "@ppl3", { secure: true });

            expect(config.properties.profiles.fruit.profiles.apple.properties.secret).toBe("@ppl3");
            expect(layer.properties.secure.length).toBe(1);
            expect(layer.properties.secure[0]).toBe("profiles.fruit.profiles.apple.properties.secret");

            expect(JSONC.stringify(layer.properties.secure, null, ConfigConstants.INDENT)).toContain(blockComment);
            expect(JSONC.stringify(layer.properties.secure, null, ConfigConstants.INDENT)).toContain(lineComment);
        });

        // NOTE: config.setSchema remove comments from the $schema property
        it("should set schema URI at top of config", async () => {
            const config = await Config.load(MY_APP);
            const layer = (config as any).layerActive();
            config.setSchema("./schema.json");
            const jsonText = JSONC.stringify(layer.properties);
            expect(jsonText.match(/^{\s*"\$schema":/)).not.toBeNull();

            const testObj = JSONC.stringify(layer.properties, null, ConfigConstants.INDENT).split("\n").find((item) => item.indexOf("$schema") >= 0);
            expect(testObj).not.toContain(blockComment);
            expect(testObj).not.toContain(lineComment);
        });
    });

    describe("delete", () => {
        beforeEach(() => {
            jest.spyOn(Config, "search").mockReturnValue(__dirname + "/__resources__/project.config.user.json");
            jest.spyOn(fs, "existsSync").mockReturnValueOnce(true).mockReturnValue(false);
            jest.spyOn(ConfigSecure.prototype, "load").mockResolvedValue(undefined);
        });

        it("should remove secure property from profile and secure array", async () => {
            const config = await Config.load(MY_APP);
            const layer = (config as any).layerActive();
            config.set("profiles.fruit.properties.secret", "area51", { secure: true });
            expect(config.properties.profiles.fruit.properties.secret).toBe("area51");
            expect(layer.properties.secure).toContain("profiles.fruit.properties.secret");
            config.delete("profiles.fruit.properties.secret");
            expect(config.properties.profiles.fruit.properties.secret).toBeUndefined();
            expect(layer.properties.secure).not.toContain("profiles.fruit.properties.secret");
        });

        it("should remove insecure property from profile only", async () => {
            const config = await Config.load(MY_APP);
            const layer = (config as any).layerActive();
            config.set("profiles.fruit.properties.secret", "area51", { secure: true });
            expect(config.properties.profiles.fruit.properties.secret).toBe("area51");
            expect(layer.properties.secure).toContain("profiles.fruit.properties.secret");
            config.delete("profiles.fruit.properties.secret", { secure: false });
            expect(config.properties.profiles.fruit.properties.secret).toBeUndefined();
            expect(layer.properties.secure).toContain("profiles.fruit.properties.secret");
        });

        it("should remove profile from config and all its properties from secure array", async () => {
            const config = await Config.load(MY_APP);
            const layer = (config as any).layerActive();
            config.set("profiles.fruit.properties.secret", "area51", { secure: true });
            expect(config.properties.profiles.fruit.properties.secret).toBe("area51");
            expect(layer.properties.secure).toContain("profiles.fruit.properties.secret");
            config.delete("profiles.fruit");
            expect(config.properties.profiles.fruit).toBeUndefined();
            expect(layer.properties.secure).not.toContain("profiles.fruit.properties.secret");
        });
    });

    describe("paths", () => {
        beforeEach(() => {
            jest.spyOn(Config, "search").mockReturnValue(__dirname + "/__resources__/project.config.user.json");
            jest.spyOn(fs, "existsSync").mockReturnValueOnce(true).mockReturnValue(false);
            jest.spyOn(ConfigSecure.prototype, "load").mockResolvedValue(undefined);
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
        const oldFindUp = findUp.sync;
        beforeEach(() => {
            jest.spyOn(findUp, "sync").mockImplementationOnce((matcher, options) => oldFindUp(matcher, {...options, cwd: configDir}));
        });
        it("should search for a file in the same directory", async () => {
            const expectedPath = path.join(configDir, configFile);
            const file = Config.search(configFile);
            expect(file).toBe(expectedPath);
        });
        it("should search for a file in the parent directory", async () => {
            const expectedPath = path.join(configDir, "..", configFile);
            jest.spyOn(fs, "existsSync").mockReturnValueOnce(false).mockReturnValue(true);
            const file = Config.search(configFile);
            expect(file).toBe(path.resolve(expectedPath));
        });
        it("should search for and not return file in the parent directory because the parent directory is the global directory", async () => {
            const notExpectedPath = path.join(configDir, "..", configFile);
            const expectedPath = path.join(configDir, "..", "..", configFile);
            jest.spyOn(fs, "existsSync").mockReturnValueOnce(false).mockReturnValue(true);
            const file = Config.search(configFile, { ignoreDirs: [path.join(configDir, "..")] });
            expect(file).not.toBe(notExpectedPath);
            expect(file).toBe(path.resolve(expectedPath));
        });
        it("should fail to find a file", async () => {
            jest.spyOn(fs, "existsSync").mockReturnValue(false);
            const file = Config.search(configFile);
            expect(file).toBeNull();
        });
        it("should search for and find a file without opts", async () => {
            const expectedPath = path.join(configDir, configFile);
            jest.spyOn(fs, "existsSync").mockReturnValue(true);
            const file = Config.search(configFile);
            expect(file).toBe(expectedPath);
        });
        it("should search for and fail to find a file without opts", async () => {
            jest.spyOn(fs, "existsSync").mockReturnValue(false);
            const file = Config.search(configFile);
            expect(file).toBeNull();
        });
    });
});
