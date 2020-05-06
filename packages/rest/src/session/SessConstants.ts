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

/* We were unable to export constants and types from a class and use
 * those constants or types within the definition of a property in an interface.
 * So we declared simple constants and types and exported them from this module.
 */

 /**
  * http protocol
  */
export const HTTP_PROTOCOL = "http";

/**
 * https protocol
 */
export const HTTPS_PROTOCOL = "https";

/**
 * type that specifies the choice of protocols
 */
export type HTTP_PROTOCOL_CHOICES =
    typeof HTTP_PROTOCOL | typeof HTTPS_PROTOCOL;

/**
 * Session type property value for no authentication
 */
export const AUTH_TYPE_NONE = "none";

/**
 * Session type property value for basic authentication
 */
export const AUTH_TYPE_BASIC = "basic";

/**
 * Session type property value for bearer token authentication
 */
export const AUTH_TYPE_BEARER = "bearer";

/**
 * Session type property value for cookie token authentication,
 * which uses a named token type.
 */
export const AUTH_TYPE_TOKEN = "token";

/**
 * type that specifies the choice of authentication types
 */
export type AUTH_TYPE_CHOICES =
    typeof AUTH_TYPE_NONE   | typeof AUTH_TYPE_BASIC |
    typeof AUTH_TYPE_BEARER | typeof AUTH_TYPE_TOKEN;

/**
 * tokenType property value for IBM's LTPA2 token
 */
export const TOKEN_TYPE_LTPA = "LtpaToken2";

/**
 * tokenType property value for a JWT token
 */
export const TOKEN_TYPE_JWT = "jwtToken";

/**
 * tokenType property value for an API Mediation Layer token
 */
export const TOKEN_TYPE_APIML = "apimlAuthenticationToken";

/**
 * type that specifies the choice of token types
 */
export type TOKEN_TYPE_CHOICES =
    typeof TOKEN_TYPE_LTPA | typeof TOKEN_TYPE_JWT |
    typeof TOKEN_TYPE_APIML;
