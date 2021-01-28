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
import { IConfigSecureFiles } from "../src/doc/IConfigSecure";
import { IConfigVault } from "../src/doc/IConfigVault";

const MY_APP = "my_app";

const projectConfigPath = path.join(__dirname, "__resources__/project.config.json");
const projectUserConfigPath = path.join(__dirname, "__resources__/project.config.user.json");
const securePropPath = "profiles.fruit.properties.secret";
const secureConfigs: IConfigSecureFiles = {
    [projectConfigPath]: {
        [securePropPath]: "area51"
    },
    fakePath: {
        [securePropPath]: "area52"
    }
};

describe("Config secure tests", () => {
    let mockSecureLoad = jest.fn();
    let mockSecureSave = jest.fn();
    let mockVault: IConfigVault = {
        load: mockSecureLoad,
        save: mockSecureSave
    }

    afterEach(() => {
        jest.restoreAllMocks();
    });

    beforeEach(() => {
        mockSecureLoad = jest.fn();
        mockSecureSave = jest.fn();
        mockVault = {
            load: mockSecureLoad,
            save: mockSecureSave
        }
    });

    it("should set vault if provided for secure load", async () => {
        const config = new (Config as any)();
        expect((config as any)._vault).toBeUndefined();
        await (config as any).secureLoad(mockVault);
        expect((config as any)._vault).toBe(mockVault);
    });

    it("should skip secure save if there are no secure properties or anything in keytar", async () => {
        const config = new (Config as any)();
        config._layers = [
            {
                properties: { secure: [] }
            }
        ];
        config._vault = mockVault;
        config._secure = {};
        config._secure.configs = {};
        config._paths = [];
        await (config as any).secureSave();
        expect(mockSecureLoad).toHaveBeenCalledTimes(0);
        expect(mockSecureSave).toHaveBeenCalledTimes(0);
    });

    it("should secure save if there are secure properties", async () => {
        const config = new (Config as any)();
        config._layers = [
            {
                path: "fake fakety fake",
                properties: { secure: ["profiles.fake.properties.fake"], profiles: {fake: { properties: {fake: "fake"}}}}
            }
        ];
        config._vault = mockVault;
        config._secure = {};
        config._secure.configs = {};
        config._paths = [];
        await (config as any).secureSave();
        expect(mockSecureLoad).toHaveBeenCalledTimes(0);
        expect(mockSecureSave).toHaveBeenCalledTimes(1);
    });

    it("should load and save all secure properties", async () => {
        jest.spyOn(Config, "search").mockReturnValueOnce(projectUserConfigPath).mockReturnValueOnce(projectConfigPath);
        jest.spyOn(fs, "existsSync").mockReturnValueOnce(false).mockReturnValueOnce(true).mockReturnValue(false);
        mockSecureLoad.mockReturnValueOnce(JSON.stringify(secureConfigs));
        const config = await Config.load(MY_APP, { vault: mockVault });
        // Check that secureLoad was called and secure value was extracted
        expect(mockSecureLoad).toHaveBeenCalledWith("secure_config_props");
        expect(config.properties.profiles.fruit.properties.secret).toBe("area51");

        const writeFileSpy = jest.spyOn(fs, "writeFileSync").mockReturnValueOnce(undefined);
        await config.api.layers.write();

        // Check that secureSave was called, secure value was preserved in
        // active layer, and the value was excluded from the config file
        expect(mockSecureSave).toHaveBeenCalledTimes(1);
        expect(mockSecureSave.mock.calls[0][0]).toBe("secure_config_props");
        expect(mockSecureSave.mock.calls[0][1]).toContain("area51");
        expect(config.properties.profiles.fruit.properties.secret).toBe("area51");
        expect(writeFileSpy).toHaveBeenCalled();
        expect(writeFileSpy.mock.calls[0][1]).not.toContain("area51");
    });

    it("should toggle the security of a property if requested", async () => {
        jest.spyOn(Config, "search").mockReturnValue(projectConfigPath);
        jest.spyOn(fs, "existsSync").mockReturnValueOnce(true).mockReturnValue(false);
        mockSecureLoad.mockImplementation();
        const config = await Config.load(MY_APP, { vault: mockVault });

        config.set(securePropPath, "notSecret", { secure: false });
        let layer = config.api.layers.get();
        expect(layer.properties.secure.includes(securePropPath)).toBe(false);

        config.set(securePropPath, "area51", { secure: true });
        layer = config.api.layers.get();
        expect(layer.properties.secure.includes(securePropPath)).toBe(true);
    });
});
