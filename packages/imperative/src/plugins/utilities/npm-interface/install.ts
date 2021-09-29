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

import { PMFConstants } from "../PMFConstants";
import * as path from "path";
import * as fs from "fs";
import { readFileSync, writeFileSync } from "jsonfile";
import { IPluginJson } from "../../doc/IPluginJson";
import { Logger } from "../../../../../logger";
import { ImperativeError } from "../../../../../error";
import { IPluginJsonObject } from "../../doc/IPluginJsonObject";
import { getPackageInfo, installPackages } from "../NpmFunctions";
import { ImperativeConfig } from "../../../../../utilities/src/ImperativeConfig";
import { ConfigSchema } from "../../../../../config/src/ConfigSchema";


/**
 * Common function that abstracts the install process. This function should be called for each
 * package that needs to be installed. (ex: `sample-cli plugin install a b c d` -> calls install 4
 * times)
 *
 * @TODO work needs to be done to support proper sharing of the plugins.json. As of now local plugins can only be reinstalled on the same machine.
 * (due to how the conversion to an absolute URI happens)
 *
 * @param {string} packageLocation A package name or location. This value can be a valid npm package
 *                                 name or the location of an npm tar file or project folder. Also,
 *                                 git URLs are also acceptable here (basically anything that `npm
 *                                 install` supports). If this parameter is a relative path, it will
 *                                 be converted to an absolute path prior to being passed to the
 *                                 `npm install` command.
 *
 * @param {string} registry The npm registry to use, this is expected to be passed by every caller
 *                          so if calling functions don't have a registry available, they need
 *                          to get it from npm.
 *
 * @param {boolean} [installFromFile=false] If installing from a file, the package location is
 *                                          automatically interpreted as an absolute location.
 *                                          It is assumed that the plugin.json file was previously
 *                                          generated by this function which always ensures an
 *                                          absolute path. Also, if this is true, we will not update
 *                                          the plugins.json file since we are not adding/modifying
 *                                          it.
 * @returns {string} The name of the plugin.
 */
export async function install(packageLocation: string, registry: string, installFromFile = false) {
    const iConsole = Logger.getImperativeLogger();
    let npmPackage = packageLocation;

    iConsole.debug(`Installing package: ${packageLocation}`);

    // Do some parsing on the package location in the case it isn't an absolute location
    // If
    //   we are not installing from a file
    //   and the location is not absolute.
    // Then
    //   we will try to convert the URI (which is a file path by the above criteria)
    //   to an absolute file path. If we can't resolve it locally, we'll leave it up to npm
    //   to do what's best.
    if (
        !installFromFile &&
        !path.isAbsolute(packageLocation)
    ) {
        const tempLocation = path.resolve(npmPackage);

        iConsole.debug(`Package is not absolute, let's see if this is a local file: ${tempLocation}`);

        // Now that we have made the location absolute...does it actually exist
        if (fs.existsSync(tempLocation)) {
            npmPackage = tempLocation;
            iConsole.info(`Installing local package: ${npmPackage}`);
        }
    }

    try {
        iConsole.debug(`Installing from registry ${registry}`);

        // Perform the npm install.
        iConsole.info("Installing packages...this may take some time.");

        installPackages(PMFConstants.instance.PLUGIN_INSTALL_LOCATION, registry, npmPackage);

        // We fetch the package name and version of newly installed plugin
        const packageInfo = await getPackageInfo(npmPackage);
        const packageName = packageInfo.name;
        let packageVersion = packageInfo.version;

        iConsole.debug("Reading in the current configuration.");
        const installedPlugins: IPluginJson = readFileSync(PMFConstants.instance.PLUGIN_JSON);

        // Set the correct name and version by checking if package is an npm package, this is done
        // by searching for a / or \ as those are not valid characters for an npm package, but they
        // would be for a url or local file.
        if (packageLocation.search(/(\\|\/)/) === -1) {
            // Getting here means that the package installed was an npm package. So the package property
            // of the json file should be the same as the package name.
            npmPackage = packageName;

            const passedVersionIdx = packageLocation.indexOf("@");
            if (passedVersionIdx !== -1) {
                packageVersion = packageLocation.substr(passedVersionIdx + 1);
            }
        }

        iConsole.debug(`Package version: ${packageVersion}`);

        const newPlugin: IPluginJsonObject = {
            package: npmPackage,
            registry,
            version: packageVersion
        };
        iConsole.debug("Updating the current configuration with new plugin:\n" +
            JSON.stringify(newPlugin, null, 2));

        installedPlugins[packageName] = newPlugin;

        iConsole.debug("Updating configuration file = " + PMFConstants.instance.PLUGIN_JSON);
        writeFileSync(PMFConstants.instance.PLUGIN_JSON, installedPlugins, {
            spaces: 2
        });

        iConsole.debug(`Checking for global team configuration files to update.`);
        if (PMFConstants.instance.PLUGIN_USING_CONFIG &&
            PMFConstants.instance.PLUGIN_CONFIG.layers.filter((layer) => layer.global && layer.exists).length > 0) {
            ConfigSchema.updateSchema({ layer: "global" });
        }

        iConsole.info("Plugin '" + packageName + "' successfully installed.");
        return packageName;
    } catch (e) {
        throw new ImperativeError({
            msg: e.message,
            causeErrors: e
        });
    }
}
