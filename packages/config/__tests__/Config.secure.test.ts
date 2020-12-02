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
import { ImperativeError } from "../..";
import { Config } from "../src/Config";

const MY_APP = "my_app";

describe("Config secure tests", () => {
    afterEach(() => {
        jest.restoreAllMocks();
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

    it("should securely load all secure properties", async () => {
        throw new Error("TODO");
    });

    it("should securely save all secure properties", async () => {
        throw new Error("TODO");
    });
});
