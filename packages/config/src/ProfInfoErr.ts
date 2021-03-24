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

// for imperative operations
import { IProfInfoErr } from "./doc/IProfInfoErr";
import { ImperativeError, IImperativeError } from "../../error";
import { IImperativeErrorParms } from "../../error/src/doc/IImperativeErrorParms";

/**
 * This class is the error exception mechanism for the ProfileInfo API.
 * It is derived from ImperativeError. We use a separate class so that
 * our consumer can check the type of error, and then rely on errorCode
 * values that are unique to ProfInfoErr. ProfInfoErr will always
 * populate the errorCode property. Our consumer can use the errorCode to
 * determine if it should process partial results.
 */
export class ProfInfoErr extends ImperativeError {

    // _______________________________________________________________________
    // The following are the complete set of errorCodes for ProfInfoErr.

    /**
     * Unable to retrieve the schema from a URL reference.
     * Currently, the ProfiInfo API does not attempt to retrieve a schema
     * through a URL. A URL does work to provide intellisense in VSCode
     * when editing a config file.
     */
    public static readonly CANT_GET_SCHEMA_URL: string = "CantGetSchemaUrl";

    /**
     * The specified type of profile location is invalid for the requested operation.
     */
    public static readonly INVALID_PROF_LOC_TYPE: string = "InvalidProfLocType";

    /**
     * Failed to load the schema for a specified type of profile.
     */
    public static readonly LOAD_SCHEMA_FAILED: string = "LoadSchemaFailed";

    /**
     * A required profile property was not assigned a value.
     */
    public static readonly MISSING_REQ_PROP: string = "MissingProp";

    /**
     * The ProfileInfo.readProfilesFromDisk function was not called before
     * a function which requires that prerequisite.
     */
    public static readonly MUST_READ_FROM_DISK: string = "MustReadFromDisk";

    /**
     * A specified property that is expected to exist in a specified profile
     * does not exist in that profile.
     */
    public static readonly PROP_NOT_IN_PROFILE: string = "PropNotInProfile";

    // _______________________________________________________________________

    /**
     * Construct the ProfInfoErr error object. It adds properties in
     * IProfInfoErr to the existing properties of ImperativeError.
     *
     * @param impErrDetails
     *        ImperativeError details and text (stack, messages, etc.)
     *
     * @param impErrParms
     *        ImperativeError control parameters to indicate logging of node-report and more
     */
    constructor(
        impErrDetails: IImperativeError,
        profErrProps?: IProfInfoErr,
        impErrParms?: IImperativeErrorParms
    ) {
        super(impErrDetails, impErrParms);
        this.name = "ProfInfoErr";
        this.mProfErrProps = profErrProps;
    }

    /**
     * Additional error properties, specific to ProfInfoErr.
     */
    private mProfErrProps: IProfInfoErr = {};

    public get itemsInError(): string[] {
        return this.mProfErrProps.itemsInError;
    }
}