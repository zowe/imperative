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
import { join } from "path";

describe("IPluginLifeCycle", () => {
    it("should have the right interface definition", () => {
        const nameMap: string = fs.readFileSync(
            join(__dirname, "../../../src/plugins/doc/IPluginLifeCycle.ts"),
            "utf8"
        );
        expect(nameMap).toContain("export interface IPluginLifeCycle");
        expect(nameMap).toContain("postInstall(): void;");
        expect(nameMap).toContain("preUninstall(): void;");
    });
});
