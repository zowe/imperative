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
    const mockSecureLoad = jest.fn();
    const mockSecureSave = jest.fn();
    const mockVault: IConfigVault = {
        load: mockSecureLoad,
        save: mockSecureSave,
        name: "fake"
    }

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("should skip secure load if there are no secure properties", async () => {
        const config = new (Config as any)();
        config._layers = [
            {
                properties: { secure: [] }
            }
        ];
        config._vault = mockVault;
        const secureFieldsSpy = jest.spyOn(config, "secureFields");
        await (config as any).secureLoad();
        expect(secureFieldsSpy).toHaveReturnedWith(false);
        expect(mockSecureLoad).not.toHaveBeenCalled();
    });

    it("should skip secure save if there are no secure properties", async () => {
        const config = new (Config as any)();
        config._layers = [
            {
                properties: { secure: [] }
            }
        ];
        config._vault = mockVault;
        const secureFieldsSpy = jest.spyOn(config, "secureFields");
        await (config as any).secureSave();
        expect(secureFieldsSpy).toHaveReturnedWith(false);
        expect(mockSecureSave).not.toHaveBeenCalled();
    });

    it("should load and save all secure properties", async () => {
        jest.spyOn(Config, "search").mockReturnValue(projectConfigPath);
        jest.spyOn(fs, "existsSync").mockReturnValueOnce(true).mockReturnValue(false);
        mockSecureLoad.mockReturnValueOnce(JSON.stringify(secureConfigs));
        const config = await Config.load(MY_APP, { vault: mockVault });
        // Check that secureLoad was called and secure value was extracted
        expect(mockSecureLoad).toHaveBeenCalledWith("secure_config_props");
        expect(config.properties.profiles.fruit.properties.secret).toBe("area51");

        const writeFileSpy = jest.spyOn(fs, "writeFileSync").mockReturnValueOnce(undefined);
        await config.api.layers.write();
        // Check that secureSave was called, secure value was preserved in
        // active layer, and the value was excluded from the config file
        expect(mockSecureSave).toHaveBeenCalled();
        expect(mockSecureSave.mock.calls[0][0]).toBe("secure_config_props");
        expect(mockSecureSave.mock.calls[0][1]).toContain("area51");
        expect(config.properties.profiles.fruit.properties.secret).toBe("area51");
        expect(writeFileSpy).toHaveBeenCalled();
        expect(writeFileSpy.mock.calls[0][1]).not.toContain("area51");
    });
});
