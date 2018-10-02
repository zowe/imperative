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

import { ImperativeError } from "../../../error";
import { IProfile } from "../../../profiles";
import { ImperativeExpect } from "../../../expect";
import { isNullOrUndefined } from "util";
import { Imperative } from "../../../index";
/**
 * Profiles map created by the command profile loader and passed to the handler via parameters. Handlers can
 * retreive loaded profiles from the map via the profile type.
 * @export
 * @class CommandProfiles
 */
export class CommandProfiles {
    /**
     * The loaded profiles map - profiles are retrieved via the type key. More than one profile of a particular type
     * can be loaded by the command processor (depending on dependencies, etc.)
     * @private
     * @type {Map<string, IProfile[]>}
     * @memberof CommandProfiles
     */
    private mMap: Map<string, IProfile[]>;

    /**
     * Creates an instance of CommandProfiles.
     * @param {Map<string, IProfile[]>} map - The map of profiles
     * @memberof CommandProfiles
     */
    constructor(map: Map<string, IProfile[]>) {
        // Simple validation of input parameters
        const err: string = "Command Profiles Internal Error:";
        ImperativeExpect.toNotBeNullOrUndefined(map, `${err} No map was supplied.`);
        ImperativeExpect.toBeEqual(map instanceof Map, true, `${err} The "map" supplied is not an instance of a map.`);

        // Ensure the correctness of each map entry
        map.forEach((value, key) => {
            ImperativeExpect.toBeAnArray(value, `${err} The "profiles" supplied for type "${key}" is NOT an array.`);
            ImperativeExpect.toBeEqual((value.length > 0), true, `${err} No profiles supplied for type "${key}".`);
            for (const prof of value) {
                ImperativeExpect.keysToBeDefinedAndNonBlank(prof, ["name"],
                    `${err} A profile supplied in the map (type "${key}") does NOT have a name.`);
                ImperativeExpect.keysToBeDefinedAndNonBlank(prof, ["type"],
                    `${err} A profile supplied in the map (type "${key}") does NOT have a type.`);
                ImperativeExpect.toBeEqual(prof.type, key,
                    `${err} A profile supplied for type "${key}" indicates a type of "${prof.type}"`);
            }
        });
        this.mMap = map;
    }

    /**
     * Gets the first (or by name) profile in the map - automatically throws an exception (unless disabled)
     * @template T - The expected profile mapping to be returned
     * @param {string} type - The profile type
     * @param {string} [name=""] - The name of the profile to retrieve
     * @param {boolean} [failNotFound=true] - Automatically throws an imperative exception if not profiles are not
     * found - this is provided as convince for the handlers (will fail your command if not found) - This would
     * normally be the result of a command configuration problem.
     * @returns {T} - The first profile in the map (or the one located by name)
     * @memberof CommandProfiles
     */
    public get<T extends IProfile>(type: string, failNotFound = true, name = ""): IProfile {
        let profile;
        // If a profile is returned for the type, then we'll check if a profile of a specific name was requseted
        // if not, just return the first profile found (first loaded)
        if (this.map.get(type) != null) {
            if (name != null && name.trim().length > 0) {
                for (const prof of this.map.get(type)) {
                    if (prof.name === name) {
                        profile = prof;
                        break;
                    }
                }
            } else {
                profile = this.map.get(type)[0];
            }
        } else if (failNotFound) {
            this.fail(type);
        }
        return profile;
    }

    /**
     * Gets all profiles for the type specified,
     * @template T - extends IProfile
     * @param {string} type - The profile type to retrieve loaded profiles
     * @returns {T[]} - The list of profile types
     * @param {boolean} [failNotFound=true] - Automatically throws an imperative exception if not profiles are not
     * found - this is provided as convince for the handlers (will fail your command if not found) - This would
     * normally be the result of a command configuration problem.
     * @memberof CommandProfiles
     */
    public getAll<T extends IProfile>(type: string, failNotFound = true): IProfile[] {
        const profiles = this.map.get(type);
        if (profiles == null && failNotFound) {
            this.fail(type);
        }
        return profiles;
    }

    /**
     * Internal accessor for the map
     * @readonly
     * @private
     * @type {Map<string, IProfile[]>} - The profile Map
     * @memberof CommandProfiles
     */
    private get map(): Map<string, IProfile[]> {
        return this.mMap;
    }

    /**
     * Throw an error failing the get(requested by the caller if no profiles are available)
     * @private
     * @param {string} type - the profile type to get from the map
     * @memberof CommandProfiles
     */
    private fail(type: string) {
        throw new ImperativeError({
            msg: `Internal Error: No profiles of type "${type}" were loaded for this command.`,
            additionalDetails: `This error can occur for one of two reasons:\n` +
                ` - The "profile" property on the command definition document ` +
                `does NOT specify the requested profile type\n` +
                ` - The profile type is marked "optional", no profiles of type "${type}" have been created, ` +
                `and the command handler requested a profile of type "${type}" with "failNotFound=true"`
        });
    }
}
