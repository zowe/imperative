
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

import { Writable, Readable } from "stream";
import { ITaskWithStatus } from "../../../../operations";
import { Session } from "../../session/Session";
import { Logger } from "../../../../logger";

export interface IRestClientResponse {
    requestSuccess?: boolean;
    requestFailure?: boolean;
    data?: Buffer;
    dataString?: string;
    response?: any;
    session?: Session;
    log?: Logger;
}

// requestFailure: "requestFailure" as CLIENT_PROPERTY,
// data: "data" as CLIENT_PROPERTY,
// dataString: "dataString" as CLIENT_PROPERTY,
// response: "response" as CLIENT_PROPERTY,
// session: "session" as CLIENT_PROPERTY,
// log: "log" as CLIENT_PROPERTY,
