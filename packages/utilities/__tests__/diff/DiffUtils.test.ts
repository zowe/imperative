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

import { DiffUtils } from "../../src/diff/DiffUtils";
import { IDiffOptions } from "../../src/diff/doc/IDiffOptions";
import { WebDiffManager } from "../../src/diff/WebDiffManager";

describe("DiffUtils", () => {

    describe("getDiffString", () => {
        let string1: string;
        let string2: string;
        let options: IDiffOptions;

        it("should return a diff string", async () => {
            string1 = "random string one";
            string2 = "random string two";
            options = { outputFormat: "unifiedstring" };
            expect(await DiffUtils.getDiffString(string1, string2, options)).toMatchSnapshot();

        });
    });

    describe("openDiffInbrowser", () => {

        it("should open the diffs in browser", async () => {
            const createTwoFilesPatchSpy = jest.fn().mockReturnValue("test");
            jest.doMock("diff", () => {
                return {
                    ...(jest.requireActual('diff')),
                    createTwoFilesPatch: createTwoFilesPatchSpy
                };
            });
            const string1 = "test string one";
            const string2 = "test string two";

            const openDiffSpy = jest.spyOn(WebDiffManager.instance, "openDiffs").mockImplementation(jest.fn());
            await DiffUtils.openDiffInbrowser(string1, string2);
            expect(createTwoFilesPatchSpy).toHaveBeenCalledWith('file-a', 'file-b', string1, string2);
            expect(openDiffSpy).toHaveBeenCalledWith("test");
        });
    });

});
