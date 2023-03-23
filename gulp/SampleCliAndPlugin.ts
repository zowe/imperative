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

import * as T from "../__tests__/src/TestUtil";
import {existsSync} from "fs";
import {execSync, SpawnSyncReturns} from "child_process";
import * as spawn from "cross-spawn";
import {join} from "path";
import * as jsonfile from "jsonfile";
import chalk from "chalk";
import {PROJECTS, SAMPLE_CLI, TEST_REGISTRY} from "../__tests__/__src__/TestConstants";
import {TestLogger} from "../__tests__/TestLogger";
import {inspect} from "util";

/**
 * Installs all 3 libraries so that we may do our testing.
 *
 * builds imperative
 * builds imperative-sample using local version of imperative and installs globally
 * builds imperative-plugins using local version of imperative
 */
export function buildAndPublishToTestRegistry() {
    console.info(chalk.yellow.bold("Building...Start"));

    console.info(chalk.bgMagenta.white.bold("Building (step 1 of 3) - Imperative CLI"));
    buildAndPublishImperativeCLI();

    console.info(chalk.bgMagenta.white.bold("Building (step 2 of 3) - Sample CLI"));
    buildAndPublishSampleCli();

    console.info(chalk.bgMagenta.white.bold("Building (step 3 of 3) - Sample CLI Plugin"));
    buildAndPublishSamplePlugin();

    console.info(chalk.green.bold("Building...Complete"));
}

/**
 * Builds the imperative (better known as this project) so that the sample cli
 * and plugin can be build using the real lib.
 */
function buildAndPublishImperativeCLI() {
    // const packageLocation = join(PROJECTS.IMPERATIVE_CLI, "package.json");

    if (!existsSync(PROJECTS.IMPERATIVE_CLI)) {
        throw new Error(`Expected to find imperative at ${PROJECTS.IMPERATIVE_CLI}`);
    }

    // Get registry information from package.json
    // const packageJson = jsonfile.readFileSync(packageLocation);
    // const savedRegistry = packageJson.publishConfig.registry;
    //
    // // Override the existing registry to be the test registry
    // packageJson.publishConfig.registry = TEST_REGISTRY;
    // jsonfile.writeFileSync(packageLocation, packageJson, {
    //     spaces: 2
    // });

    // Try to publish but always revert back when done
    // try {
        // Login to the test NPM registry
        // await doNpmLogin(process.cwd());

    // Run the build
    execSync("gulp build", {
        cwd: PROJECTS.IMPERATIVE_CLI,
        stdio: "inherit"
    });

        // // Try to do the publish
        // execSync(`npm publish --tag ${useTag}`, {
        //   stdio: "inherit"
        // });
    // } finally {
    //     // Set everything back to how it was before coming in here
    //     packageJson.publishConfig.registry = savedRegistry;
    //     jsonfile.writeFileSync(packageLocation, packageJson, {
    //         spaces: 2
    //     });
    // }
}

/**
 * Builds the sample cli using the local version of imperative. This function
 * does modify the package.json of imperative-sample, but it will always restore
 * it back to its original state when finished.
 *
 * After this function is run, sample-cli will be available in your console
 */
function buildAndPublishSampleCli() {
    const packageLocation = join(PROJECTS.IMPERATIVE_SAMPLE, "package.json");

    if (!existsSync(PROJECTS.IMPERATIVE_CLI)) {
        throw new Error(`Expected to find imperative at ${PROJECTS.IMPERATIVE_CLI}`);
    }

    if (!existsSync(PROJECTS.IMPERATIVE_SAMPLE)) {
        throw new Error(`Expected to find imperative-sample at ${PROJECTS.IMPERATIVE_SAMPLE}`);
    }

    // Get dependency version from package.json
    const packageJson = jsonfile.readFileSync(packageLocation);
    const localVersion = "file:../imperative";
    const savedImperativeVersion = packageJson.dependencies["imperative"];

    // Override the existing install location to point to our local copy
    packageJson.dependencies["imperative"] = localVersion;
    jsonfile.writeFileSync(packageLocation, packageJson, {
        spaces: 2
    });

    // Try to publish but always revert back when done
    try {
        // Login to the test NPM registry
        // await doNpmLogin(process.cwd());

        // Run the install
        execSync("npm install --ignore-scripts", {
            cwd: PROJECTS.IMPERATIVE_SAMPLE,
            stdio: "inherit"
        });

        // Run the build
        execSync("npm run build", {
            cwd: PROJECTS.IMPERATIVE_SAMPLE,
            stdio: "inherit"
        });

        // Link to the global directory
        execSync("npm link", {
            cwd: PROJECTS.IMPERATIVE_SAMPLE,
            stdio: "inherit"
        });

        // // Try to do the publish
        // execSync(`npm publish --tag ${useTag}`, {
        //   stdio: "inherit"
        // });
    } finally {
        // Set everything back to how it was before coming in here
        packageJson.dependencies["imperative"] = savedImperativeVersion;
        jsonfile.writeFileSync(packageLocation, packageJson, {
            spaces: 2
        });
    }
}

/**
 * Builds the imperative sample plugin using the local version of imperative.
 * This function does modify the package.json of imperative-plugins, but it will
 * always restore it back to its original state when finished.
 *
 * After this function is run, the plugin will be installable to sample cli
 * through the plugin management facility.
 */
function buildAndPublishSamplePlugin() {
    const packageLocation = join(PROJECTS.IMPERATIVE_PLUGINS, "package.json");


    if (!existsSync(PROJECTS.IMPERATIVE_CLI)) {
        throw new Error(`Expected to find imperative at ${PROJECTS.IMPERATIVE_CLI}`);
    }

    if (!existsSync(PROJECTS.IMPERATIVE_PLUGINS)) {
        throw new Error(`Expected to find imperative-plugins at ${PROJECTS.IMPERATIVE_PLUGINS}`);
    }


    // Get dependency version from package.json
    const packageJson = jsonfile.readFileSync(packageLocation);
    const localVersion = "file:../imperative";
    const savedImperativeVersion = packageJson.devDependencies["imperative"];

    // Override the existing install location to point to our local copy
    packageJson.devDependencies["imperative"] = localVersion;
    jsonfile.writeFileSync(packageLocation, packageJson, {
        spaces: 2
    });

    // Try to publish but always revert back when done
    try {
        // Login to the test NPM registry
        // await doNpmLogin(process.cwd());

        // Run the install
        execSync("npm install", {
            cwd: PROJECTS.IMPERATIVE_PLUGINS,
            stdio: "inherit"
        });

        // Link to the global directory which also runs the build
        execSync("gulp build", {
            cwd: PROJECTS.IMPERATIVE_PLUGINS,
            stdio: "inherit"
        });

        // // Try to do the publish
        // execSync(`npm publish --tag ${useTag}`, {
        //   stdio: "inherit"
        // });
    } finally {
        // Set everything back to how it was before coming in here
        packageJson.devDependencies["imperative"] = savedImperativeVersion;
        jsonfile.writeFileSync(packageLocation, packageJson, {
            spaces: 2
        });
    }
}

/**
 * Removes the home directory of the sample-cli application. Good for keeping
 * the environment clean between tests
 */
export function cleanSampleCliHome() {
    T.rimraf(SAMPLE_CLI.HOME);
}

/**
 * Clean up the sample-cli home directory and uninstall the imperative sample app
 */
export function uninstallImperativeSample() {
    cleanSampleCliHome();
    execSync("npm uninstall -g imperative-sample", {
        stdio: "inherit"
    });
}

/**
 * Executes a sample-cli command and returns the response. This command turns off
 * colors in the environment so that string comparisons can be easily done on
 * the output.
 *
 * @param {string[]} args The arguments for the sample-cli command
 * @returns {SpawnSyncReturns<string>} The raw result of the spawnSync command
 */
export function sampleCliCommand(args: string[]): SpawnSyncReturns<string> {
    const sampleCli = "sample-cli";
    const testLogger = TestLogger.getTestLogger();
    testLogger.info(`Executing "${sampleCli} ${args.join(" ")}"`);

    const childEnv = {
        ...process.env,
        FORCE_COLOR: "0"
    };

    const child = spawn.sync(sampleCli, args, {
        encoding: "utf8",
        env: childEnv,
        shell: true
    });

    if (child.status == null) {
        testLogger.error(inspect(child, {depth: null}));
        throw new Error("Error spawning child process to execute command: " + child.error);
    }

    return child;
}


/**
 * This function will log us into the npm test registry at the current cwd. This
 * allows for us to do the publish to the test tag specified.
 *
 * @TODO Currently we have run into a bit of a hiccup with our test registry so reverting to good old local files for now
 *
 * @param {string} cwd The cwd that we should login at
 * @returns {Promise<void>} A promise that indicates we are done
 */
// function doNpmLogin(cwd: string): Promise<void>{
//   return new Promise((resolve, reject) => {
//     let tracker = 0;
//     let failReason: Error;
//
//     // Spawn the login command
//     const loginProcess = spawn("npm", ["login", "--registry", testRegistry], {
//       cwd,
//       shell: true
//     });
//
//     // Listen to stdout so that we can respond to the prompts
//     loginProcess.stdout.on("data", (data) => {
//       const prompt = data.toString();
//
//       // These variables define the order of the prompts and messages expected to
//       // be returned by the login command.
//       const usernameIdx = 0;
//       const passwordIdx = 1;
//       const emailIdx = 2;
//       const successIdx = 3;
//
//       testLogger.info(prompt);
//
//       if (tracker === usernameIdx) {
//         testLogger.info("Passing in the dummy username");
//         loginProcess.stdin.write("integration-user\n");
//       } else if (tracker === passwordIdx) {
//         testLogger.info("Passing in the dummy password");
//         loginProcess.stdin.write("integration-password\n");
//       } else if (tracker === emailIdx) {
//         testLogger.info("Passing in the dummy email");
//         loginProcess.stdin.write("integration-email@ca.com\n");
//       } else if (tracker > successIdx){
//         testLogger.info(prompt);
//         failReason = new Error(`Something went wrong while trying to login. Last piece of data presented to us: ${prompt}`);
//         loginProcess.kill();
//       }
//
//       tracker++;
//     });
//
//     // Cleanly return the promise
//     loginProcess.on("close", (code) => {
//       testLogger.info("npm login process closed");
//
//       if (code === 0 && !failReason) {
//         resolve();
//       } else {
//         if (failReason) {
//           reject(failReason);
//         } else {
//           reject(new Error(`npm login exited with code ${code}`));
//         }
//       }
//     });
//   });
// }

