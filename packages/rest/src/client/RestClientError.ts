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
import { IRestClientError } from "./doc/IRestClientError";
import { IImperativeErrorParms } from "../../../error/src/doc/IImperativeErrorParms";

export class RestClientError extends ImperativeError {
    constructor(public mDetails: IRestClientError, parms?: IImperativeErrorParms) {
        super(mDetails, parms);
    }

    public get host(): string {
        return this.mDetails.host;
    }

    public get errno(): string {
        return this.mDetails.errno;
    }

    public get syscall(): string {
        return this.mDetails.syscall;
    }

    public get port(): number {
        return this.mDetails.port;
    }

    public get httpStatus(): number {
        return this.mDetails.httpStatus;
    }

    public get basePath(): string {
        return this.mDetails.basePath;
    }

    public get headers(): any[] {
        return this.mDetails.headers;
    }

    public get resource(): string {
        return this.mDetails.resource;
    }

    public get payload(): string {
        return this.mDetails.payload;
    }

    public get request(): string {
        return this.mDetails.request;
    }
}
