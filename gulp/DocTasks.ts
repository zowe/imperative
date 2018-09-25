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

import { ITaskFunction } from "./GulpHelpers";
let typedoc: any;
let gulp: any;

function loadDependencies() {
    typedoc = require("gulp-typedoc");
    gulp = require("gulp");
}

const generateTsdoc: ITaskFunction = () => {
    loadDependencies();
    return gulp
        .src(["packages/**/*.ts", "!**/__tests__/**"])
        .pipe(typedoc({
            target: "es2015",
            module: "commonjs",
            out: "doc/tsdoc/",
            ignoreCompilerErrors: true
        }));
};

generateTsdoc.description = "Generate TSDoc (JSDoc for TypeScript)";
exports.generateTsdoc = generateTsdoc;
