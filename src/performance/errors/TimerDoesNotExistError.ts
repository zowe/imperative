/*
 * This program and the accompanying materials are made available under the terms of the *
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at  *
 * https://www.eclipse.org/legal/epl-v20.html                                            *
 *                                                                                       *
 * SPDX-License-Identifier: EPL-2.0                                                      *
 *                                                                                       *
 * Copyright Contributors to the Zowe Project.                                           *
 *                                                                                       *
 */

import { PerformanceError } from "./PerformanceError";

/**
 * @TODO better documentation
 *
 * This error is thrown when a function timer is attempted to be closed but no
 * timer exists currently.
 */
export class TimerDoesNotExistError extends PerformanceError {
    constructor(name: string) {
        super(`A function timer with the name "${name}", does not exist. Please create the timer first.`);
    }
}
