/*
* This program and the accompanying materials are made available under the terms of the *
* Eclipse Public License v2.0 which accompanies this distribution, and is available at *
* https://www.eclipse.org/legal/epl-v20.html                                      *
*                                                                                 *
* SPDX-License-Identifier: EPL-2.0                                                *
*                                                                                 *
* Copyright Contributors to the Zowe Project.                                     *
*                                                                                 *
*/

import {TextUtils} from "../../../../packages/utilities";

describe("TextUtils", () => {

    it("should be able to color text yellow", () => {
        const chalk = TextUtils.chalk;
        chalk.level = 1; // set basic color mode for OS independence
        const text = TextUtils.chalk.yellow("highlighting with chalk") + " hello";
        expect(text).toMatchSnapshot();
    });

    it("should be able to color text red", () => {
        TextUtils.chalk.level = 1; // set basic color mode for OS independence
        const text = TextUtils.chalk.red("highlighting with chalk") + " hello";
        expect(text).toMatchSnapshot();
    });

});
