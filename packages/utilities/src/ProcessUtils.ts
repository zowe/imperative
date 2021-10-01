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

/**
 * This enum represents the possible results from isGuiAvailable.
 */
export enum GuiResult {
    /** A GUI is available */
    GUI_AVAILABLE = 0,

    /** No GUI because this is an SSH connection. */
    NO_GUI_SSH = 1,

    /** No GUI because The $DISPLAY environment variable is not set. */
    NO_GUI_NO_DISPLAY = 2
}

/**
 * A collection of utilities related to the running process.
 * @export
 * @class ProcessUtils
 */
export class ProcessUtils {
    // __________________________________________________________________________
    /**
     * Process utility to wrap callback process routines into promises
     * Turn nextTick into a promise to prevent nesting
     * @static
     * @param {() => void} callback - called before promise is resolved
     * @param {...any[]} args - arguments passed to the callback
     * @returns {Promise<void>} - fullfilled whenever callback is invoked
     * @memberof ProcessUtils
     */
    public static nextTick(callback: (...args: any[]) => void, ...args: any[]): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            process.nextTick(() => {
                callback(...args);
                resolve();
            });
        });
    }

    // __________________________________________________________________________
    /**
     * Is a Graphical User Interface avaiable in the environment in which
     * the current command is running?
     *
     * @returns {boolean} - True if GUI. False when no GUI.
     */
    public static isGuiAvailable(): GuiResult {
        /* If any of the SSH environment variables are defined,
         * then we are in an ssh session --> no GUI.
         */
        if (typeof process.env.SSH_CONNECTION !== "undefined" ||
            typeof process.env.SSH_CLIENT !== "undefined" ||
            typeof process.env.SSH_TTY !== "undefined")
        {
            return GuiResult.NO_GUI_SSH;
        }

        /* On linux the DISPLAY environment variable indicates
         * that we are in an X-Window environment.
         */
        if (process.platform !== "win32" && process.platform !== "darwin") {
            if (typeof process.env.DISPLAY === "undefined" ||
                process.env.DISPLAY === "")
            {
                return GuiResult.NO_GUI_NO_DISPLAY;
            }
        }

        // otherwise we assume we have a GUI
        return GuiResult.GUI_AVAILABLE;
    }
}
