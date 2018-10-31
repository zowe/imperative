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

import { ICommandResponse } from "../../../../../packages/cmd/src/doc/response/ICommandResponse";
import { ICompareParms } from "../../../doc/ICompareParms";

/**
 * Expected JSON responses from test command output handlers. The intention here is to formulate all the fields
 * in the response that you would like to verify as output from your test handler.
 *
 * The exported objects must match the command name to be handled by the tests automatically.
 *
 * TODO? If we decide on Jest, we can use snapshots instead here.
 */

export interface IExpectedJsonResponses {
    response: ICommandResponse;
    diffParms?: ICompareParms;
}

export const failurewiththrow: IExpectedJsonResponses = {
    response: {
        success: false,
        message: "",
        stdout: Buffer.from([77, 101, 115, 115, 97, 103, 101, 32, 102, 114, 111, 109, 32, 102, 97, 105, 108, 117, 114, 101, 32, 104, 97, 110, 100, 108, 101, 114, 32, 119, 105, 116, 104, 32, 116, 104, 114, 111, 119, 46, 10]),
        stderr: Buffer.from([27, 91, 51, 49, 109, 27, 91, 51, 57, 109, 10, 27, 91, 51, 49, 109, 73, 109, 112, 101, 114, 97, 116, 105, 118, 101, 32, 65, 80, 73, 32, 69, 114, 114, 111, 114, 58, 27, 91, 51, 57, 109, 10, 84, 104, 101, 32, 104, 97, 110, 100, 108, 101, 114, 32, 119, 105, 116, 104, 32, 116, 104, 114, 111, 119, 32, 104, 97, 115, 32, 115, 117, 99, 99, 101, 115, 115, 102, 117, 108, 108, 121, 32, 102, 97, 105, 108, 101, 100, 46, 10]),
        responseObject: [],
        errors:
            [
                {
                    msg: "The handler with throw has successfully failed."
                }
            ]
    },
    // diffParms: {
    //     pathRegex: [{
    //         path: "stdout",
    //         regex: /Message from failure handler with throw./
    //     }, {
    //         path: "stderr",
    //         regex: /The handler with throw has successfully failed./
    //     }]
    // }
};

export const failurewithgenericthrow: IExpectedJsonResponses = {
    response: {
        success: false,
        message: "",
        stdout: Buffer.from([77, 101, 115, 115, 97, 103, 101, 32, 102, 114, 111, 109, 32, 102, 97, 105, 108, 117, 114, 101, 32, 104, 97, 110, 100, 108, 101, 114, 32, 119, 105, 116, 104, 32, 103, 101, 110, 101, 114, 105, 99, 32, 116, 104, 114, 111, 119, 46, 10]),
        responseObject: [{}],
        errors: []
    },
    diffParms: {
        pathRegex: [{
            path: "stderr",
            regex: new RegExp("^An unexpected command error occurred:[\\s\\S]*This is an uncaught\/unhandled exception the " +
                "failure handler\\.[\\s\\S]*Error: This is an uncaught\/unhandled exception the failure handler\\.[\\s\\S]*$")
        }]
    }
};

export const failurewithpromise: IExpectedJsonResponses = {
    response: {
        success: false,
        message: "",
        stdout: Buffer.from(""),
        stderr: Buffer.from([77, 101, 115, 115, 97, 103, 101, 32, 102, 114, 111, 109, 32, 102, 97, 105, 108, 117, 114, 101, 32, 104, 97, 110, 100, 108, 101, 114, 32, 119, 105, 116, 104, 32, 112, 114, 111, 109, 105, 115, 101, 46, 10]),
        responseObject: [],
        errors: []
    }
};

export const successwithasync: IExpectedJsonResponses = {
    response: {
        success: true,
        message: "",
        stdout: Buffer.from([77, 101, 115, 115, 97, 103, 101, 32, 102, 114, 111, 109, 32, 115, 117, 99, 99, 101, 115, 115, 32, 97, 115, 121, 110, 99, 32, 104, 97, 110, 100, 108, 101, 114, 46, 10]),
        stderr: Buffer.from(""),
        responseObject: [],
        errors: []
    }
};

export const successwithpromise: IExpectedJsonResponses = {
    response: {
        success: true,
        message: "",
        stdout: Buffer.from([77, 101, 115, 115, 97, 103, 101, 32, 102, 114, 111, 109, 32, 115, 117, 99, 99, 101, 115, 115, 32, 104, 97, 110, 100, 108, 101, 114, 32, 119, 105, 116, 104, 32, 112, 114, 111, 109, 105, 115, 101, 46, 10]),
        stderr: Buffer.from(""),
        responseObject: [],
        errors: []
    }
};

export const successwithvariousoutput: IExpectedJsonResponses = {
    response: {
        success: true,
        message: "",
        stdout: Buffer.from("Sdtout message from various output handler.\nData buffer to stdout from various output handler."),
        stderr: Buffer.from([83, 100, 116, 101, 114, 114, 32, 109, 101, 115, 115, 97, 103, 101, 32, 102, 114, 111,
            109, 32, 118, 97, 114, 105, 111, 117, 115, 32, 111, 117, 116, 112, 117, 116, 32, 104, 97, 110, 100, 108, 101,
            114, 46, 10, 68, 97, 116, 97, 32, 98, 117, 102, 102, 101, 114, 32, 116, 111, 32, 115, 116, 100, 101, 114, 114,
            32, 102, 114, 111, 109, 32, 118, 97, 114, 105, 111, 117, 115, 32, 111, 117, 116, 112, 117, 116, 32, 104, 97,
            110, 100, 108, 101, 114, 46, 27, 91, 51, 49, 109, 27, 91, 51, 57, 109, 10, 27, 91, 51, 49, 109, 73, 109, 112,
            101, 114, 97, 116, 105, 118, 101, 32, 65, 80, 73, 32, 69, 114, 114, 111, 114, 58, 27, 91, 51, 57, 109, 10, 73,
            109, 112, 101, 114, 97, 116, 105, 118, 101, 32, 69, 114, 114, 111, 114, 32, 49, 32, 105, 110, 32, 86, 97, 114,
            105, 111, 117, 115, 32, 111, 117, 116, 112, 117, 116, 32, 104, 97, 110, 100, 108, 101, 114, 46, 10, 27, 91, 51,
            49, 109, 27, 91, 51, 57, 109, 10, 27, 91, 51, 49, 109, 73, 109, 112, 101, 114, 97, 116, 105, 118, 101, 32, 65,
            80, 73, 32, 69, 114, 114, 111, 114, 58, 27, 91, 51, 57, 109, 10, 73, 109, 112, 101, 114, 97, 116, 105, 118,
            101, 32, 69, 114, 114, 111, 114, 32, 50, 32, 105, 110, 32, 86, 97, 114, 105, 111, 117, 115, 32, 111, 117, 116, 112,
            117, 116, 32, 104, 97, 110, 100, 108, 101, 114, 46, 10]),
        responseObject: [{obj1: "object"}, {obj2: "other-object"}],
        errors: [{msg: "Imperative Error 1 in Various output handler."},
            {msg: "Imperative Error 2 in Various output handler."}]
    },
};
