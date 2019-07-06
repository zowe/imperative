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

import { ICommandDefinition } from "../../cmd/src/doc/ICommandDefinition";

describe("ImperativeConfig", () => {
    const {ImperativeConfig} = require("../../utilities/src/ImperativeConfig");

    const mockConfig = {
        name: "test-cli",
        allowPlugins: false,
        allowConfigGroup: false,
        defaultHome: "/home/santa/northPole",
        overrides: {
            CredentialManager: "some-string.ts"
        }
    };

    beforeEach(() => {
        ImperativeConfig.instance.loadedConfig = mockConfig;
    });

    describe("The instance", () => {
        it("should exist", async () => {
            expect(ImperativeConfig.instance).toBeTruthy();
        });

        it("should getCallerFile", async () => {
            ImperativeConfig.instance.getCallerFile("package.json");
        });

        it("should set and get callerLocation", async () => {
            const mockLocation = __dirname;
            ImperativeConfig.instance.callerLocation = mockLocation;
            expect(ImperativeConfig.instance.callerLocation).toBe(mockLocation);
        });

        it("should set and get rootCommandName", async () => {
            const mockCmdName = "worstCmdEver";
            ImperativeConfig.instance.rootCommandName = mockCmdName;
            expect(ImperativeConfig.instance.rootCommandName).toBe(mockCmdName);
        });

        it("should get hostPackageName", async () => {
            expect(ImperativeConfig.instance.hostPackageName).toBe("@zowe/imperative");
        });

        it("should get imperativePackageName", async () => {
            expect(ImperativeConfig.instance.imperativePackageName).toBe("@zowe/imperative");
        });

        it("should findPackageBinName", async () => {
            // We are in the imperative project. It has no binName, so null.
            expect(ImperativeConfig.instance.findPackageBinName()).toBe(null);
        });

        it("should set and get loadedConfig", async () => {
            expect(ImperativeConfig.instance.loadedConfig).toBe(mockConfig);
        });

        it("should get cliHome", async () => {
            expect(ImperativeConfig.instance.cliHome).toBe(mockConfig.defaultHome);
        });
    });

});
