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

import {AbstractCredentialManager} from "../abstract/AbstractCredentialManager";

const DefaultCredentialManager = jest.fn();

// Preserve inheritance
DefaultCredentialManager.prototype = new (AbstractCredentialManager as any)();

// Mock the methods
DefaultCredentialManager.prototype.initialize = jest.fn();
DefaultCredentialManager.prototype.deleteCredentials = jest.fn();
DefaultCredentialManager.prototype.loadCredentials = jest.fn();
DefaultCredentialManager.prototype.saveCredentials = jest.fn();

exports.DefaultCredentialManager = DefaultCredentialManager;
