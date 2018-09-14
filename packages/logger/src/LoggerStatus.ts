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

import {IQueuedMessage} from "./doc/IQueuedMessage";

/**
 * LoggerStatus is a singleton class used to contain logger information.
 */

export class LoggerStatus {

    private static mInstance: LoggerStatus = null;

    public static get instance(): LoggerStatus {
        if (this.mInstance == null) {
            this.mInstance = new LoggerStatus();
        }

        return this.mInstance;
    }


    private mIsLoggerInit: boolean = false;
    private mQueuedMessages: IQueuedMessage[] = [];

    public get isLoggerInit(): boolean {
        return this.mIsLoggerInit;
    }

    public set isLoggerInit(status: boolean) {
        this.mIsLoggerInit = status;
    }

    /**
     * This function is responsible for gathering all of the input parameters and
     * store them in the message queue array.
     * New messages are to be stored at the top of the array instead of the bottom.
     * This allow easy removing message from array while looping the array.
     * @param category - logger category
     * @param method - log method
     * @param message - log message
     */
    public queueMessage(category: string, method: string, message: string){
        this.mQueuedMessages.unshift({
            category,
            method,
            message
        });
    }

    public get QueuedMessages(): IQueuedMessage[] {
        return this.mQueuedMessages;
    }


}
