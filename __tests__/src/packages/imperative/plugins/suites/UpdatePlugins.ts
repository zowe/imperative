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

import * as T from "../../../../../src/TestUtil";
import { cliBin } from "../PluginManagementFacility.spec";
import { join } from "path";

describe("Update plugin", () => {
    const testPluginDir = join(__dirname, "../test_plugins");

    const removeNewline = (str: string): string => {
        str = str.replace(/\r?\n|\r/g, " ");
        return str;
    };

    it("should update plugin properly", () => {
        const pluginName = "normal-plugin";
        const testPlugin = join(testPluginDir, "normal_plugin");
        let cmd = `plugins install ${testPlugin}`;
        let result = T.executeTestCLICommand(cliBin, this, cmd.split(" "));
        expect(result.stdout).toContain(`Installed plugin name = '${pluginName}'`);

        cmd = `plugins update ${pluginName}`;
        result = T.executeTestCLICommand(cliBin, this, cmd.split(" "));
        result.stdout = removeNewline(result.stdout);
        expect(result.stdout).toContain("Update of the npm package");
        expect(result.stdout).toContain("was successful.");
    });

    it("should display proper message when no plugin package is provided", () => {
        const cmd = `plugins update`;
        const result = T.executeTestCLICommand(cliBin, this, cmd.split(" "));
        expect(result.stderr).toContain("Plugin name is required.");
    });
});
