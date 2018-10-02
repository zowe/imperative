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

import { IErrorReportParms } from "./../../error";
import { isNullOrUndefined } from "util";
import { ImperativeError } from "./ImperativeError";
import { IErrorSavedSettings } from "./doc/IErrorSavedSettings";

/**
 * Class to make use of node-report as an optional dependency.  This is optional
 * because it is a native module with native dependencies.
 * @export
 * @class ErrorReport
 */
export class ErrorReport {

    /**
     * Message for uninstalled node-report
     * @static
     * @memberof ErrorReport
     */
    public static readonly NOT_INSTALLED_MESSAGE = "Node-report is not installed";

    /**
     * Return a report to the called to be displayed or logged in the format of the
     * caller's choosing.
     * @static
     * @param {IErrorReportParms} parms - parms object to configure the report (see IErrorReportParms)
     * @returns {string} - returns string report
     * @memberof ErrorReport
     */
    public static obtain(parms?: IErrorReportParms): string {
        const settings = ErrorReport.setEnvironment(parms);
        let report: string;
        try {
            const nodeReport = require("node-report");
            report = nodeReport.getReport();
        } catch (error) {
            report = ErrorReport.NOT_INSTALLED_MESSAGE;
        } finally {
            ErrorReport.restoreEnvironment(settings);
        }
        return report;
    }

    /**
     * Trigger a report to be generated as a text document.
     * @static
     * @param {IErrorReportParms} parms - parms object to configure the report (see IErrorReportParms)
     * @memberof ErrorReport
     */
    public static trigger(parms?: IErrorReportParms) {
        const settings = ErrorReport.setEnvironment(parms);
        try {
            const nodeReport = require("node-report");
            nodeReport.triggerReport();
        } catch (error) {
            // return ErrorReport.NOT_INSTALLED_MESSAGE;
        } finally {
            ErrorReport.restoreEnvironment(settings);
        }
    }

    /**
     * Set environment variables for node report prior to using it.
     * @private
     * @static
     * @param {IErrorReportParms} parms - parms object to configure the report (see IErrorReportParms)
     * @memberof ErrorReport
     */
    private static setEnvironment(parms?: IErrorReportParms) {
        const settings: IErrorSavedSettings = {};
        settings.NODEREPORT_VERBOSE = "no";
        if (!isNullOrUndefined(parms)) {
            if (!isNullOrUndefined(parms.verbose)) {
                process.env.NODEREPORT_VERBOSE = parms.verbose;
            }
        }
        return settings;
    }

    /**
     * Restore environmental settings
     * @private
     * @static
     * @param {IErrorSavedSettings} settings - object to contain restoration values for env variable
     * @memberof ErrorReport
     */
    private static restoreEnvironment(settings: IErrorSavedSettings) {
        process.env.NODEREPORT_VERBOSE = settings.NODEREPORT_VERBOSE;
    }
}
