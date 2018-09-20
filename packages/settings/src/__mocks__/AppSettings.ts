/*
 * This program and the accompanying materials are made available under the terms of the *
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at  *
 * https://www.eclipse.org/legal/epl-v20.html                                            *
 *                                                                                       *
 * SPDX-License-Identifier: EPL-2.0                                                      *
 *                                                                                       *
 * Copyright Contributors to the Zowe Project.                                           *
 *                                                                                       *
 */

import { ISettingsFile } from "../doc/ISettingsFile";

/*
 * This file mocks the AppSettings class and tries to keep some of the logic in tact.
 * Almost all methods of app settings are now a mock object so you can spy on the class.
 */

// Define the constructor of the mock app settings class
function Settings() {
    this.setNewOverride = jest.fn();

    this.settings = { // tslint:disable-line
        overrides: {
            CredentialManager: false
        }
    } as ISettingsFile;
}

// Mock the constructor and have Settings be the instance
const AppSettings: any = jest.fn(Settings);

// Define the static mInstance private variable
AppSettings.mInstance = null;

// Define the initialize method mock and implementation
AppSettings.initialize = jest.fn(() => {
    if (AppSettings.mInstance != null) {
        throw new Error("AppSettings was already initialized. If this has changed please alter the mock logic");
    }

    AppSettings.mInstance = new AppSettings();

    return AppSettings.mInstance;
});

// Define the instance getter property and implementation
Object.defineProperty(AppSettings, "instance", {
    get: () => {
        if (AppSettings.mInstance == null) {
            throw new Error("AppSettings should be initialized first. If this has changed please alter the mock logic");
        }

        return AppSettings.mInstance;
    }
});

// Export the mocked settings object :)
exports.AppSettings = AppSettings;
