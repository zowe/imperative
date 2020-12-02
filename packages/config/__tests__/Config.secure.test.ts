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

import { Config } from "../src/Config";
import { IConfigVault } from "../src/doc/IConfigVault";

describe("Config secure tests", () => {
    const mockVault: IConfigVault = {
        load: jest.fn(),
        save: jest.fn(),
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
        await (config as any).secureLoad();
        expect(mockVault.load).not.toHaveBeenCalled();
    });

    it("should skip secure save if there are no secure properties", async () => {
        const config = new (Config as any)();
        config._layers = [
            {
                properties: { secure: [] }
            }
        ];
        await (config as any).secureSave();
        expect(mockVault.save).not.toHaveBeenCalled();
    });

    xit("should securely load all secure properties", async () => {
        throw new Error("TODO");
    });

    xit("should securely save all secure properties", async () => {
        throw new Error("TODO");
    });
});
