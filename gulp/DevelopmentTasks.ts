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

import { IGulpError, ITaskFunction } from "./GulpHelpers";
import { execSync, SpawnSyncReturns } from "child_process";
import * as spawn from "cross-spawn";
import { buildAndPublishToTestRegistry } from "./SampleCliAndPlugin";

let ansiColors: any;
let childProcess: any;
let fancylog: any;
let rimraf: any;
let fs: any;
let compileDir: any;
let gulp: any;
let clearRequire: any;
let gulpDebug: any;
let gulpReplace: any;

function loadDependencies() {
    ansiColors = require("ansi-colors");
    childProcess = require("child_process");
    fancylog = require("fancy-log");
    rimraf = require("rimraf").sync;
    fs = require("fs");
    compileDir = "lib";
    gulp = require("gulp");
    clearRequire = require("clear-require");
    gulpDebug = require("gulp-debug");
    gulpReplace = require("gulp-replace");
}

// use the local versions of tsc and madge so people don't have to globally install
const tscExecutable = "node_modules/typescript/bin/tsc";
const npmExecutable = "npm" + (require("os").platform() === "win32" ? ".cmd" : "");
const madgeExecutable = "node_modules/madge/bin/cli.js";

function isLowerCase(str: string) {
    return str.toLowerCase() === str;
}

const lint: ITaskFunction = (done) => {
    loadDependencies();
    let lintProcess: SpawnSyncReturns<string | Buffer>;
    try {
        lintProcess = spawn.sync("npm", ["run", "lint"], {stdio: "inherit", shell: true});

    } catch (e) {
        fancylog(ansiColors.red("Error encountered trying to run eslint"));
        done(e);
        return;
    }

    try {
        if (lintProcess.status !== 0) {
            const lintWarning: IGulpError =
                new Error(ansiColors.yellow("Linting failed. Please correct the issues above."));
            lintWarning.showStack = false;
            done(lintWarning);
        } else {
            fancylog(ansiColors.blue("No style problems"));
            done();
        }
    }
    catch (e) {
        fancylog(ansiColors.red("Error encountered trying to check CLI definitions for consistency"));
        done(e);
        return;
    }
};
lint.description = "Runs eslint on the project to check for style";

const prepForDirectInstall: ITaskFunction = (done) => {
    loadDependencies();
    fancylog("Prep response: " + execSync("git pull").toString());
    fancylog(spawn.sync("node", [tscExecutable]).stdout.toString());
};

prepForDirectInstall.description = "Pulls from the repo on current branch and compiles source to be installed" +
    " by a relative project, e.g. package.json dependencies : { \"imperative\": \"file:..\\imperative\"";

const checkCircularDependencies: ITaskFunction = (done) => {
    loadDependencies();
    fancylog(ansiColors.blue("Checking for circular dependencies in the compiled source..."));
    const madgeResults = spawn.sync("node", [madgeExecutable, "-c", "lib"]);
    fancylog(madgeResults.stdout.toString());
    if (madgeResults.status === 0) {
        fancylog(ansiColors.blue("No circular dependencies"));
        done();
    } else {
        const circularError: any = new Error(ansiColors.red("\"Madge\" circular dependency check failed"));
        circularError.showStack = false;
        done(circularError);
    }
};
checkCircularDependencies.description = "Uses the \"madge\" package to check the source for circular dependencies";
const license: ITaskFunction = (done: (err: Error) => void) => {
    loadDependencies();
    // process all typescript files
    require("glob")("{__mocks__,packages,gulp,__tests__}/**/*.ts", (globErr: any, filePaths: string[]) => {
        if (globErr) {
            done(globErr);
            return;
        }
        // turn the license file into a multi line comment
        const desiredLineLength = 80;
        let alreadyContainedCopyright = 0;
        const header = "/*\n" + fs.readFileSync("LICENSE_HEADER").toString()
                .split(/\r?\n/g).map((line: string) => {
                    return `* ${line}`.trim();
                })
                .join(require("os").EOL) + require("os").EOL + "*/" +
            require("os").EOL + require("os").EOL;
        try {
            for (const filePath of filePaths) {
                const file = fs.readFileSync(filePath);
                let result = file.toString();
                const resultLines = result.split(/\r?\n/g);
                if (resultLines.join().indexOf(header.split(/\r?\n/g).join()) >= 0) {
                    alreadyContainedCopyright++;
                    continue; // already has copyright
                }
                const shebangPattern = require("shebang-regex");
                let usedShebang = "";
                result = result.replace(shebangPattern, (fullMatch: string) => {
                    usedShebang = fullMatch + "\n"; // save the shebang that was used, if any
                    return "";
                });
                // remove any existing copyright
                // Be very, very careful messing with this regex. Regex is wonderful.
                result = result.replace(/\/\*[\s\S]*?(License|SPDX)[\s\S]*?\*\/[\s\n]*/i, "");
                result = header + result; // add the new header
                result = usedShebang + result; // add the shebang back
                fs.writeFileSync(filePath, result);
            }
            fancylog(ansiColors.blue("Ensured that %d files had copyright information" +
                " (%d already did)."), filePaths.length, alreadyContainedCopyright);
        } catch (e) {
            done(e);
        }
        done(undefined);
    });
};

const watch: ITaskFunction = (done) => {
    loadDependencies();
    gulp.watch("packages/**", gulp.series("lint"));
    const watchProcess = childProcess.spawn("node", [tscExecutable, "--watch"], {stdio: "inherit"});
    watchProcess.on("error", (error: Error) => {
        fancylog(error);
        throw error;
    });
    watchProcess.on("close", () => {
        fancylog("watch process closed");
        done();
    });
};
watch.description = "Continuously build the project as you edit the source. To get full linting results and " +
    "generate documentation, use the 'build' task before attempting to merge with the master branch";
const build: ITaskFunction = (done) => {
    loadDependencies();
    license((licenseErr?: Error) => {
        if (licenseErr) {
            fancylog(ansiColors.red("Error encountered while adding copyright information"));
            done(licenseErr);
        }
        if (fs.existsSync("tsconfig.tsbuildinfo")) {
            fs.unlinkSync("tsconfig.tsbuildinfo");
        }
        if (fs.existsSync(compileDir)) {
            rimraf(compileDir);
            fancylog("Deleted old compiled source in '%s' folder", compileDir);
        }
        const compileProcess = spawn.sync("node", [tscExecutable]);
        const typescriptOutput = compileProcess.output.join("");
        if (typescriptOutput.trim().length > 0) {
            fancylog("Typescript output:\n%s", typescriptOutput);
        }
        if (compileProcess.status !== 0) {
            const buildFailedError: IGulpError = new Error(ansiColors.red("Build failed"));
            buildFailedError.showStack = false;
            done(buildFailedError);
        }
        else {
            fancylog(ansiColors.blue("Compiled typescript successfully"));

            lint(
                (lintWarning: Error) => {
                    if (lintWarning) {
                        done(lintWarning);
                        return;
                    }
                    checkCircularDependencies((madgeError?: Error) => {
                        if (madgeError) {
                            done(madgeError);
                            return;
                        }
                        fancylog(ansiColors.blue("Build succeeded"));
                        done();
                    });
                });
        }
    });
};
build.description = "Build the project and generate documentation";

const installAllCliDependencies: ITaskFunction = async () => {
    loadDependencies();
    const cliDirs: string[] = getDirectories(__dirname + "/../__tests__/__integration__/");
    cliDirs.forEach((dir) => {
        // Perform an NPM install
        fancylog(`Executing "npm install" for "${dir}" cli to obtain dependencies...`);
        const installResponse = spawn.sync((process.platform === "win32") ? "npm.cmd" : "npm", ["install"],
            {cwd: __dirname + `/../__tests__/__integration__/${dir}/`});
        if (installResponse.stdout && installResponse.stdout.toString().length > 0) {
            fancylog(`***INSTALL "${dir}" stdout:\n${installResponse.stdout.toString()}`);
        }
        if (installResponse.stderr && installResponse.stderr.toString().length > 0) {
            fancylog(`***INSTALL "${dir}" stderr:\n${installResponse.stderr.toString()}`);
        }
        if (installResponse.status !== 0) {
            throw new Error(`Install dependencies failed for "${dir}" test CLI. Status code: "${installResponse.status}". ` +
                `Please review the stdout/stderr for more details.`);
        }
        fancylog(`Install for "${dir}" cli dependencies complete.`);
    });
};

const buildAllClis: ITaskFunction = async () => {
    loadDependencies();
    const cliDirs: string[] = getDirectories(__dirname + "/../__tests__/__integration__/");
    cliDirs.forEach((dir) => {
        // Build them all
        fancylog(`Build "${dir}" cli...`);
        const buildResponse = spawn.sync((process.platform === "win32") ? "npm.cmd" : "npm", ["run", "build"],
            {cwd: __dirname + `/../__tests__/__integration__/${dir}/`});
        if (buildResponse.stdout && buildResponse.stdout.toString().length > 0) {
            fancylog(`***BUILD "${dir}" stdout:\n${buildResponse.stdout.toString()}`);
        }
        if (buildResponse.stderr && buildResponse.stderr.toString().length > 0) {
            fancylog(`***BUILD "${dir}" stderr:\n${buildResponse.stderr.toString()}`);
        }
        if (buildResponse.status !== 0) {
            throw new Error(`Build failed for "${dir}" test CLI. Status code: "${buildResponse.status}". ` +
                `Please review the stdout/stderr for more details.`);
        }
        fancylog(`Build for "${dir}" cli completed successfully.`);
    });
};

function getDirectories(path: string) {
    return fs.readdirSync(path).filter((file: string) => {
        return fs.statSync(path + "/" + file).isDirectory();
    });
}

/**
 * Build imperative, then imperative-sample pointing to imperative,
 * then link the sample to the global directories, then build the sample plugin.
 */
const buildSampleCli: ITaskFunction = () => {
    loadDependencies();
    buildAndPublishToTestRegistry();
};
buildSampleCli.description =
    "Builds all 3 repositories (imperative, sample, and plugins). After this is done, sample-cli is accessible from a console.";

exports.build = build;
exports.watch = watch;
exports.lint = lint;
exports.prepForDirectInstall = prepForDirectInstall;
exports.license = license;
exports.checkCircularDependencies = checkCircularDependencies;
exports.buildSampleCli = buildSampleCli;
exports.buildAllClis = buildAllClis;
exports.installAllCliDependencies = installAllCliDependencies;
