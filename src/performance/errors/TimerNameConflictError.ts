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
 * @TODO BETTER DOCUMENT
 *
 * Error thrown when a timer in the functionTimers map already exists.
 */
export class TimerNameConflictError extends PerformanceError {
    constructor(name: string) {
        super(`A timer with the name "${name} was previously created. Please create unique timer names.`);
    }
}
