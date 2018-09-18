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

import { AbstractCredentialManager, ICredentialManagerConstructor } from "../../../security";
import { IConstructor } from "../../../interfaces";

/**
 * Type of the {@link IImperativeOverrides} interface. This will ensure that all keys
 * are pointing to a constructor or a string.
 *
 * Based on architectural decisions and ease of development, all future additions to
 * the {@link IImperativeOverrides} object must represent one of the following 2 types:
 *
 * - **{@link IConstructor}** - This is a reference to a class constructor that will be used
 *                              by the {@link OverridesLoader} when creating the various
 *                              overrides factories.
 * - **string** - An absolute or relative path to an import module from which either the
 *                {@link OverridesLoader} or the {@link PluginManagementFacility} will
 *                load before using the constructor in a factory. If defined in this
 *                sense, all type checks will be lost and we gain the ability to reside
 *                in a static file.
 *
 */
interface IOverridesRestriction {
    [key: string]: IConstructor<any> | string;
}

/**
 * All of the Default Imperative classes that can be changed by your Imperative CLI app.
 *
 * A plugin can also define overrides through the same means as an Imperative CLI app.
 * When additional overrides provided by plugins are present, Imperative will favor
 * those classes over ones provided by your application.
 *
 * @TODO ADD MORE DETAILS HERE LATER
 */
export interface IImperativeOverrides extends IOverridesRestriction {
  /**
   * A class that your Imperative CLI app can provide us in place of our
   * {@link DefaultCredentialManager}, so that you can meet your security
   * requirements. The provided class must extend Imperative's
   * {@link AbstractCredentialManager}
   *
   * There are 2 ways that you can specify your credential manager to us:
   * 1. If you are within any code statements, you can directly provide a class that adheres to the
   *    {@link ICredentialManagerConstructor}
   *    - {@link IImperativeConfig.configurationModule}
   *    - {@link Imperative.init}
   * 2. You can also provide a string specifying the location of a module to load.
   *
   * ### Directly Providing a Class (Way #1)
   *
   * This method is fairly straight forward as all that you need to do is provide the class name
   * of a class that adheres to the {@link ICredentialManagerConstructor}.
   *
   * ### Specifying the Location of a Class Module (Way #2)
   *
   * This method is a bit more complicated compared to Way #1, but it allows for your package.json to
   * contain all of your necessary config. The string parameter can either be an absolute path (for
   * those cases where you want to have a bit more control by using `__dirname`) or a relative path.
   *
   * In the case that the string is a relative path, it __MUST__ be a path relative to the entry
   * point of your CLI.
   *
   * For example:
   *
   * __Assume__
   *  - `/` is the root of your project
   *  - `/lib/index.js` is the compiled entry point of your project.
   *  - `/lib/overrides/OverrideCredentialManager.js` is the compiled location of your credential manager
   *
   * __Then__
   *  - `IImperativeOverrides.CredentialManager = "./overrides/OverrideCredentialManager";`
   *
   * #### Expected Format of Module File
   *
   * Imperative will expect that the file specified in the location string exports a class that extends
   * the {@link AbstractCredentialManager}. This can be done in TypeScript in one of the following ways:
   *
   * _Exporting an Anonymous Class_
   * ```TypeScript
   * export = class extends AbstractCredentialManager {
   *   // Code goes here
   * };
   * ```
   *
   * _Exporting a Named Class_
   * ```TypeScript
   * export = class CredentialManager extends AbstractCredentialManager {
   *   // Code goes here
   * };
   * ```
   *
   * _Using `module.exports` (Not preferred for TypeScript Users)_
   * ```TypeScript
   * class CredentialManager extends AbstractCredentialManager {
   *   // Code goes here
   * }
   *
   * module.exports = CredentialManager;
   * ```
   */
  CredentialManager?: ICredentialManagerConstructor | string;
}
