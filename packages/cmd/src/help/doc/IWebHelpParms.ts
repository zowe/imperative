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

import { ICommandDefinition } from "../../doc/ICommandDefinition";

/**
 * This is the set of parameters used by WebHelp modules.
 * They are supplied by the imperative module.
 */
export interface IWebHelpParms {
    /**
     * Contents of the package.json of our calling CLI.
     */
    callerPackageJson: any;

    /**
     * The path to the user's CLI home directory for the CLI's runtime files.
     */
    cliHome: string;

    /**
     * The home directory for your CLI's configuration, logging,
     * extensions, etc.
     *     e.g.  "~"/.myapp"
     * Defaults to ~/.yourcliname
     *
     * Todo: Determine why WebHelp uses both cliHome and defaultHome.
     */
    defaultHome: string;

    /**
     * A reference to our CLI's full command tree.
     */
    fullCommandTree: ICommandDefinition;

    /**
     * The display name for your CLI, used in messages.
     */
    productDisplayName: string;

    /**
     * The CLI's top-level command name. It is the first property name under
     * the 'bin' property in the CLI's package.json file.
     */
    rootCommandName: string;

    /**
     * The description that will be displayed if the user
     * gets help on the CLI's root command.
     */
    rootCommandDescription: string;

    /**
     * Path to an image of a logo for a CLI.
     * It will be displayed at the top of web help pages.
     */
    webHelpLogoImgPath: string;

    /**
     * Path to a custom CSS file for web help.
     * It will replace the main.css file that controls the style of the page.
     */
    webHelpCustomCssPath: string;
}
