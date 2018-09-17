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

import {readFileSync, writeFile} from "jsonfile";
import {existsSync} from "fs";
import {ISettingsFile} from "./doc/ISettingsFile";
import {Logger} from "../../logger";

/**
 * A recovery function to handle when a settings file is missing on an initialization function.
 *
 * @param settingsFile The file that could not be found
 * @param defaultSettings The default settings provided by {@link AppSettings}
 *
 * @returns The settings content to be merged into the defaults.
 */
export type FileRecovery = (settingsFile: string, defaultSettings: ISettingsFile) => ISettingsFile;

/**
 * This class represents settings for an Imperative CLI application that can be configured
 * by an end user by modifying a settings file. @TODO expand on this doc
 */
export class AppSettings {
    /**
     *
     * @param settingsFile The settings file to load from.
     * @param missingFileRecovery A recovery function when the settings file isn't found
     *
     * @throws {@link SettingsAlreadyInitialized} When the settings singleton has previously been initialized.
     */
    public static initialize(settingsFile: string, missingFileRecovery ?: FileRecovery): AppSettings {
        if (AppSettings.mInstance) {
            // Throw an error imported at runtime so that we minimize file that get included
            // on startup.
            const { SettingsAlreadyInitialized } = require("./errors/index");
            throw new SettingsAlreadyInitialized();
        }

        AppSettings.mInstance = new AppSettings(settingsFile, missingFileRecovery);
        return AppSettings.mInstance;
    }


    /**
     * This is an internal reference to the static settings instance.
     */
    private static mInstance: AppSettings;

    /**
     * Get the singleton instance of the app settings object that was initialized
     * within the {@link AppSettings.initialize} function.
     *
     * @returns A singleton AppSettings object
     *
     * @throws {@link SettingsNotInitialized} When the settings singleton has not been initialized.
     */
    public static get instance(): AppSettings {
        if (AppSettings.mInstance == null) {
            // Throw an error imported at runtime so that we minimize file that get included
            // on startup.
            const { SettingsNotInitialized } = require("./errors/index");
            throw new SettingsNotInitialized();
        }

        return AppSettings.mInstance;
    }

    /**
     * Internal reference to the overrides settings. The defaults should
     * all be false, indicating that there are no overrides to be done.
     */
    public readonly settings: ISettingsFile;

    /**
     * Constructs a new settings object
     *
     * @param settingsFile  The full path to a settings file to load.
     * @param missingFileRecovery A recovery function for when the settings file didn't exist
     */
    constructor(settingsFile: string, missingFileRecovery ?: FileRecovery) {
        let settings: ISettingsFile;
        const defaultSettings: ISettingsFile = {
            overrides: {
                CredentialManager: false
            }
        };

        try {
            // Try to load the file immediately, if it fails we will then
            // try to recover
            Logger.getImperativeLogger().trace(`Attempting to load settings file: ${settingsFile}`);
            settings = readFileSync(settingsFile);
            Logger.getImperativeLogger().trace("Settings were loaded");
        } catch (up) {
            if (missingFileRecovery && !existsSync(settingsFile)) {
                Logger.getImperativeLogger().trace("Executing missing file recovery.");
                settings = missingFileRecovery(settingsFile, defaultSettings);
            } else {
                Logger.getImperativeLogger().error("Unable to recover from load failure");
                Logger.getImperativeLogger().error(up.toString());
                // Throw up if there is no recovery function or there was a recovery
                // function but the file already existed. (Indicates there was a bigger
                // issue at play)
                throw up;
            }
        }

        // Merge objects loaded recursively
        const mergeObjects = require("merge-objects");
        this.settings = mergeObjects(defaultSettings, settings);

        Logger.getImperativeLogger().trace("Loaded Settings:");
        Logger.getImperativeLogger().trace(this.settings as any); // This works because someone does the object translation

        writeFile(settingsFile, this.settings, {
            spaces: 2
        }, (err) => {
            if (err) {
                Logger.getImperativeLogger().error("Unable to save settings");
                Logger.getImperativeLogger().error(err.toString());
            }
        });
    }
}
