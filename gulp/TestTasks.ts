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
import { isNullOrUndefined } from "util";
import { sync } from "cross-spawn";

/**
 * Tasks related to running automated tests
 */
let ansiColors: any;
let fancylog: any;
let fs: any;
let chalk: any;
let gulp: any;
let plumber: any;
let yaml: any;
let yargs: any;
let childProcess: any;
const jestExecutable = __dirname + "/../node_modules/jest/bin/jest";
const testResultsDir = __dirname + "/../__tests__/__results__";

const unitTestReport = require("../package.json")["jest-stare"].resultDir;
const integrationTestReport = require("path").resolve(testResultsDir + "/integration/results.html");

function loadDependencies() {
    ansiColors = require("ansi-colors");
    fancylog = require("fancy-log");
    childProcess = require("cross-spawn");
    fs = require("fs");
    chalk = require("chalk");
    gulp = require("gulp");
    plumber = require("gulp-plumber");
    yaml = require("js-yaml");
    yargs = require("yargs").option("namePattern", {
        type: "string"
    }).option("filePattern", {
        type: "string"
    }).option("integration", {
        type: "boolean"
    }).option("runInBand", {
        type: "boolean",
        default: false
    }).argv;
}

require("ts-node/register");

/**
 * Default properties location assumes that the tasks cwd is the project root.
 */
const CUSTOM_PROPERTIES = "custom_properties.yaml";
const DEFAULT_PROPERTIES_LOCATION = "./__tests__/__resources__/properties/";
const ALL_TESTS: any = undefined; // already stored in package.json

// the equivalent to mocha's --grep is  --testNamePattern
// default options to run jest tests
const JEST_OPTIONS: any = {
    coverage: true
};

/**
 * Run Jest tests. By default, runs unit tests.
 * @param overrideOptions - if you want, you can override JEST_OPTIONS with some custom options, including running different tests e.g. integration
 * @param done - callback when done
 * @param filePattern - regex pattern of files to run
 */
function jestTest(overrideOptions: any, done: any, filePattern = "packages.*__tests__.*\\.(spec|test)\\.ts$", unit = true) {
    loadDependencies();
    const options = overrideOptions || JEST_OPTIONS;
    fancylog("Running tests that match pattern: " + options.testNamePattern + " in files matching: ");
    let fullArgs = ["--max_old_space_size=4000", // allow more memory to be used if needed
    ];


    options.testRegex = "(test|spec)\.ts$";
    const jestArgs = [jestExecutable];
    // convert the object of arguments into command line arguments
    for (const optionName of Object.keys(options)) {
        jestArgs.push("--" + optionName);
        if (options[optionName] !== true) {
            jestArgs.push(options[optionName]);
        }
    }

    const runInBandOption = "--runInBand";
    if (yargs.runInBand && jestArgs.indexOf(runInBandOption) < 0) {
        fancylog("--runInBand specified: " + yargs.runInBand);
        jestArgs.push(runInBandOption);
    }

    jestArgs.push(filePattern); // add the file pattern as the last argument

    // For unit tests - ignore test/src/ directory
    if (unit === true) {
        jestArgs.push("--testPathIgnorePatterns");
        jestArgs.push("__tests__\\__src__\\.*");
        jestArgs.push("--testPathIgnorePatterns");
        jestArgs.push("__tests__\\__integration__\\.*");
    }

    fullArgs = fullArgs.concat(jestArgs);
    fancylog("Executing node " + fullArgs.join(" "));

    const childEnv = JSON.parse(JSON.stringify(process.env)); // copy current env
    childEnv.FORCE_COLOR = "1";
    const jestProcess = childProcess.sync("node", fullArgs, {
        stdio: "inherit",
        env: childEnv,
        windowsVerbatimArguments: true
    });

    try {
        const directory: string = __dirname + "/../__tests__/__results__/log/";
        const files: string[] = fs.readdirSync(directory);
        if (files) {
            files.forEach((fl) => {
                if (!fl.endsWith(".html")) {
                    try {
                        const contents: Buffer = fs.readFileSync(directory + fl).toString()
                            .split(" ").join("&nbsp;")
                            .split("\n").join("\n<br>");
                        fs.writeFileSync(directory + fl + ".html", contents);
                    } catch (e) {
                        fancylog("Error reading test log file: " + e.message);
                    }
                }
            });
        }
    } catch (e) {
        const testError: IGulpError =
            new Error(ansiColors.red("Unable to post-process the Jest test logs: " + e.message));
        testError.showStack = false;
        done(testError);
        return;
    }
    done();

}

const runIntegrationTests = (done: any,
                             overrideOptions: any = JSON.parse(JSON.stringify(JEST_OPTIONS)),
                             filePattern = "__tests__.((__integration__)|src)") => {
    overrideOptions.runInBand = true;
    overrideOptions.coverageDirectory = "<rootDir>/__tests__/__results__/integration/coverage";
    jestTest(overrideOptions, (err?: Error) => {
        // jest html reporter is configured to send to unit test file by default,
        // so we'll move it to the integration folder
        // having a test failure also counts as an error so we'll still try to
        // copy thereportbefore we check the error.
        if (fs.existsSync(unitTestReport)) {
            try {
                const integrationTestResultContent = fs.readFileSync(unitTestReport);
                const integrationTestFolder = require("path").dirname(integrationTestReport);
                require("fs-extra").mkdirpSync(integrationTestFolder);
                fs.writeFileSync(integrationTestReport, integrationTestResultContent);
                require("rimraf").sync(unitTestReport);
                fancylog(ansiColors.blue("Integration test report moved from unit folder to " + integrationTestReport));
            }
            catch (e) {
                fancylog(ansiColors.red("Error encountered while copying integration test results"));
                if (!isNullOrUndefined(err)) {
                    // if we already saw an error , show both messages.
                    e = new Error("Jest error:" + err.message + "\nReport copy error:" + e.message);
                }
                done(e);
                return;
            }
        }
        if (err) {
            fancylog(ansiColors.red("Integration tests failed"));

            done(err);
            return;
        }


        done();
    }, filePattern, false);
};

const testIntegration: ITaskFunction = (done: any) => {
    loadDependencies();
    runIntegrationTests(done, undefined);
};

const runAllTests: ITaskFunction = (done: any) => {
    loadDependencies();
    runIntegrationTests((err?: Error) => {
        if (!isNullOrUndefined(err)) {
            done(err);
            return;
        }
        jestTest(undefined, done);
    });
};

const runUnitTests: ITaskFunction = (done: any) => {
    loadDependencies();
    jestTest(undefined, done);
};


const runTestsWithFilePattern: ITaskFunction = (done: any) => {
    loadDependencies();

    if (isNullOrUndefined(yargs.filePattern)) {
        const err: any = new Error("You must specify --filePattern to use this task.");
        err.showStack = false;
        done(err);
        return;
    }
    const filePattern = yargs.filePattern;
    const unit = yargs.unit;
    fancylog("Executing tests that match file pattern: " + filePattern);
    if (yargs.integration) {
        runIntegrationTests(done, undefined, filePattern);
    } else {
        jestTest(undefined, done, filePattern, unit);
    }
};


const runTestsWithPattern: ITaskFunction = (done: any) => {
    loadDependencies();
    const overrideOptions = JEST_OPTIONS;
    if (isNullOrUndefined(yargs.namePattern)) {
        const err: any = new Error("You must specify --namePattern to use this task.");
        err.showStack = false;
        done(err);
        return;
    }
    overrideOptions.testNamePattern = yargs.namePattern;
    fancylog("Executing tests that match test name pattern: " + overrideOptions.grep);
    if (yargs.integration) {
        runIntegrationTests(done, overrideOptions);
    } else {
        jestTest(overrideOptions, done);
    }
};

const removeTestResultsDir: ITaskFunction = (done: any) => {
    const rimraf = require("rimraf").sync;
    rimraf(testResultsDir);
    done();
};

const installSampleClis: ITaskFunction = (done: any) => {
    loadDependencies();
    const cliDirs: string[] = getDirectories(__dirname + "/../__tests__/__integration__/");
    cliDirs.forEach((dir) => {
        // Globally install them all them all
        fancylog(`Globally installing "${dir}" cli...`);
        const globalInstallResponse = sync((process.platform === "win32") ? "npm.cmd" : "npm", ["install", "-g"],
            {cwd: __dirname + `/../__tests__/__integration__/${dir}/`});
        if (globalInstallResponse.stdout && globalInstallResponse.stdout.toString().length > 0) {
            fancylog(`***GLOBAL INSTALL for "${dir}" stdout:\n${globalInstallResponse.stdout.toString()}`);
        }
        if (globalInstallResponse.stderr && globalInstallResponse.stderr.toString().length > 0) {
            fancylog(`***GLOBAL INSTALL "${dir}" stderr:\n${globalInstallResponse.stderr.toString()}`);
        }
        if (globalInstallResponse.status !== 0) {
            done(new Error(`Global install failed for "${dir}" test CLI. Status code: "${globalInstallResponse.status}". ` +
                `Please review the stdout/stderr for more details.`));
        }
        fancylog(`Global install for "${dir}" cli completed successfully.`);
    });
    done();
};

const uninstallSampleClis: ITaskFunction = (done: any) => {
    loadDependencies();

    // On Windows, npm@6 removes dependencies from node_modules when it uninstalls test CLIs.
    // For Windows CI builds, we don't really need to uninstall the test CLIs so we skip it.
    // TODO Remove this hack once we stop using npm@6 in CI builds
    if (process.platform === "win32" && process.env.CI === "true") {
        fancylog("Skipping uninstall of test CLIs in CI environment");
        done();
        return;
    }

    const cliDirs: string[] = getDirectories(__dirname + "/../__tests__/__integration__/");
    cliDirs.forEach((dir) => {
        // Globally uninstall them all them all
        fancylog(`Globally uninstalling "${dir}" cli...`);
        const globalInstallResponse = sync((process.platform === "win32") ? "npm.cmd" : "npm", ["uninstall", "-g"],
            {cwd: __dirname + `/../__tests__/__integration__/${dir}/`});
        if (globalInstallResponse.stdout && globalInstallResponse.stdout.toString().length > 0) {
            fancylog(`***GLOBAL UNINSTALL for "${dir}" stdout:\n${globalInstallResponse.stdout.toString()}`);
        }
        if (globalInstallResponse.stderr && globalInstallResponse.stderr.toString().length > 0) {
            fancylog(`***GLOBAL UNINSTALL "${dir}" stderr:\n${globalInstallResponse.stderr.toString()}`);
        }
        if (globalInstallResponse.status !== 0) {
            throw new Error(`Global uninstall failed for "${dir}" test CLI. Status code: "${globalInstallResponse.status}". ` +
                `Please review the stdout/stderr for more details.`);
        }
        fancylog(`Global uninstall for "${dir}" cli completed successfully.`);
    });
    done();
};

function getDirectories(path: string) {
    return fs.readdirSync(path).filter((file: string) => {
        return fs.statSync(path + "/" + file).isDirectory();
    });
}

/**
 * Set the task description property (displayed from gulp --tasks)
 */
const integrationOptionHelp = " Use --integration to use options used in integration tests such as --runInBand," +
    " and copy the results to the proper folder.";
removeTestResultsDir.description = "Delete the test results directory";
runAllTests.description = "Run all of the automated tests - unit and integration";
testIntegration.description = "Run jest integration tests in test/ folder";
runUnitTests.description = "Run Jest unit tests in __tests__ folders";
runTestsWithFilePattern.description = "Run jest tests in files that match a file glob e.g. gulp test:filePattern " +
    "--filePattern \"Process\". " + integrationOptionHelp;
runTestsWithPattern.description = "Run jest tests whose name matches a string  e.g. gulp test:namePattern " +
    "--namePattern \"create a profile\" " + integrationOptionHelp;

/**
 * Export the test task functions
 */
exports.runAllTests = runAllTests;
exports.namePattern = runTestsWithPattern;
exports.testIntegration = testIntegration;
exports.runUnitTests = runUnitTests;
exports.filePattern = runTestsWithFilePattern;
exports.removeTestResultsDir = removeTestResultsDir;
exports.installSampleClis = installSampleClis;
exports.uninstallSampleClis = uninstallSampleClis;
