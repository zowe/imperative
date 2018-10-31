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
        stdout: Buffer.from("Message from failure handler with throw.\n"),
        stderr: Buffer.from("\u001b[31m\u001b[39m\n\u001b[31mImperative API Error:\u001b[39m\nThe handler with throw has successfully failed.\n"),
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
        stdout: Buffer.from("Message from failure handler with generic throw.\n"),
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
        stderr: Buffer.from("Message from failure handler with promise.\n"),
        responseObject: [],
        errors: []
    }
};

export const successwithasync: IExpectedJsonResponses = {
    response: {
        success: true,
        message: "",
        stdout: Buffer.from("Message from success handler with promise.\n"),
        stderr: Buffer.from(""),
        responseObject: [],
        errors: []
    }
};

export const successwithpromise: IExpectedJsonResponses = {
    response: {
        success: true,
        message: "",
        stdout: Buffer.from("Message from success handler with promise.\n"),
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
        stderr: Buffer.from("Sdterr message from various output handler.\nData buffer to stderr from various output handler." +
            "\u001b[31m\u001b[39m\n\u001b[31mImperative API Error:\u001b[39m\nImperative Error 1 in Various output handler." +
            "\n\u001b[31m\u001b[39m\n\u001b[31mImperative API Error:\u001b[39m\nImperative Error 2 in Various output handler.\n"),
        responseObject: [{obj1: "object"}, {obj2: "other-object"}],
        errors: [{msg: "Imperative Error 1 in Various output handler."},
            {msg: "Imperative Error 2 in Various output handler."}]
    },
};
