/*
* This program and the accompanying materials are made available under the terms of the *
* Eclipse Public License v2.0 which accompanies this distribution, and is available at *
* https://www.eclipse.org/legal/epl-v20.html                                      *
*                                                                                 *
* SPDX-License-Identifier: EPL-2.0                                                *
*                                                                                 *
* Copyright Contributors to the Zowe Project.                                     *
*/

import { ErrorReport } from "../../error";
describe("Error Report", () => {
    /**
     * NOTE(Kelosky):
     * jest takes over require for mocking, native modules (like node-report)
     * run into problems when being loaded.  it looks like jest has some support
     * for loading native-react modules, so perhaps we just need to do something
     * similar to accommodate loading node-report.
     */
    it("Should get an error report", () => {
        expect(ErrorReport.obtain()).toBeDefined();
    });
});
