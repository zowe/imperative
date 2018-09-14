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
import { Console } from "../../console";

/**
 * LoggerManager is a singleton class used to contain logger information.
 */

export class LoggerManager {
    private static readonly DEFAULT_MAX_QUEUE_SIZE = 10000;
    private static mInstance: LoggerManager = null;

    public static get instance(): LoggerManager {
        if (this.mInstance == null) {
            this.mInstance = new LoggerManager();
        }

        return this.mInstance;
    }

    private mIsLoggerInit: boolean = false;
    private mLogInMemory: boolean = false;
    private mMaxQueueSize: number;
    private console: Console;
    private mQueuedMessages: IQueuedMessage[] = [];

    constructor() {
        this.console = new Console();
        this.mMaxQueueSize = LoggerManager.DEFAULT_MAX_QUEUE_SIZE;
    }

    public get isLoggerInit(): boolean {
        return this.mIsLoggerInit;
    }

    public set isLoggerInit(status: boolean) {
        this.mIsLoggerInit = status;
    }

    public get logInMemory(): boolean {
        return this.mLogInMemory;
    }

    public set logInMemory(status: boolean) {
        this.mLogInMemory = status;
    }

    public get maxQueueSize(): number {
        return this.mMaxQueueSize;
    }

    public set maxQueueSize(size: number){
        this.mMaxQueueSize = size;
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
        if (this.logInMemory) {
            this.mQueuedMessages.unshift({
                category,
                method,
                message
            });

            if (this.mQueuedMessages.length > this.maxQueueSize) {
                this.mQueuedMessages.pop();
            }
        } else {
            this.console.info(message);
        }
    }

    public get QueuedMessages(): IQueuedMessage[] {
        return this.mQueuedMessages;
    }

}
