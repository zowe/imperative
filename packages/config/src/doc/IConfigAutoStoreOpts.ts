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

import { ICommandArguments } from "../../../cmd/src/doc/args/ICommandArguments";
import { IHandlerParameters } from "../../../cmd/src/doc/handler/IHandlerParameters";

export interface IConfigAutoStoreFindActiveProfileOpts {
    params?: IHandlerParameters;
    profileProps?: string[];
    profileTypes?: string[];
    defaultProfileName?: string;
}

export interface IConfigAutoStoreFindAuthHandlerForProfileOpts extends IConfigAutoStoreFindActiveProfileOpts {
    profilePath?: string;
    cmdArguments?: ICommandArguments;
    defaultBaseProfileName?: string;
}

export interface IConfigAutoStoreStoreSessCfgPropsOpts extends IConfigAutoStoreFindAuthHandlerForProfileOpts {
    sessCfg?: { [key: string]: any };
    propsToStore?: string[];
    profileName?: string;
    profileType?: string;
}

