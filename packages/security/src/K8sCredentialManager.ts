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

import { AbstractCredentialManager, SecureCredential } from "./abstract/AbstractCredentialManager";
import { ImperativeError } from "../../error";
import { Logger } from "../../logger";

// Has to be required instead of imported since it causes import issues
const k8s = require("@kubernetes/client-node");

type KubeConfig = {
    namespace: string;
    username: string;
};

export class K8sCredentialManager extends AbstractCredentialManager {
    public static readonly SVC_NAME = "k8s";
    private allServices: string[];
    private secretName: string;
    private kubeConfig: KubeConfig;
    private kc: any;

    constructor(service: string, displayName: string = "K8s Credential Manager") {
        super(service, displayName);
        this.allServices = [service || K8sCredentialManager.SVC_NAME];
        if (this.defaultService === K8sCredentialManager.SVC_NAME) {
            this.allServices.push("@zowe/cli", "Zowe-Plugin", "Broadcom-Plugin");
        }
        this.kc = this.setupKubeConfig();
        this.secretName = `zowe-creds-${this.kubeConfig.username}`;
    }

    /**
     * Called by {@link CredentialManagerFactory.initialize}
     * Creates the desired namespace if it doesn't exist on Kubernetes
     *
     * @returns {Promise<void>} A promise that the function has completed.
     *
     * @throws {@link ImperativeError} if authentication token or endpoint is not defined.
     */
    public async initialize(): Promise<void> {
        try {
            await this.kc.readNamespace(this.kubeConfig.namespace, "true");
            Logger.getImperativeLogger().debug(`Namespace ${this.kubeConfig.namespace} was found`);
        } catch (err: any) {
            const authenticationErrorCode = 403;
            if(err.statusCode === authenticationErrorCode) {
                throw new ImperativeError({ msg: "Authentication error when trying to access kubernetes cluster. Login to cluster and try again." });
            }
            Logger.getImperativeLogger().debug(`Namespace ${this.kubeConfig.namespace} not found, creating the namespace now`);
            await this.createNamespace();
        }
    }

    /**
     * Helper to load credentials from Kubernetes cluster
     * @param account The string account name.
     * @returns A promise for the credential string.
     */
    protected async loadCredentials(account: string, optional?: boolean): Promise<SecureCredential> {
        Logger.getImperativeLogger().debug(`Loading k8s secret ${this.secretName}`);
        let secureValue: any = null;
        try {
            const response: any = await this.readNamespacedSecret();
            secureValue = response.body.data["credentials"];
        } catch (err) {
            secureValue = null;
        }

        if (secureValue == null && !optional) {
            throw new ImperativeError({
                msg: "Unable to load credentials.",
                additionalDetails: this.getMissingEntryMessage(account)
            });
        }

        if (secureValue != null) {
            const impLogger = Logger.getImperativeLogger();
            impLogger.info("Successfully loaded secure value for service = '" + this.service +
        "' account = '" + account + "'");
        }

        return secureValue;
    }

    /**
     * Calls the K8s API to store as secrets with {@link DefaultCredentialManager#service} and the
     * account and credentials passed to the function by Imperative.
     *
     * @param {string} account The account to set credentials
     * @param {SecureCredential} credentials The credentials to store
     *
     * @returns {Promise<void>} A promise that the function has completed.
     *
     * @throws {@link ImperativeError} if call to K8s API fails.
     */
    protected async saveCredentials(account: string, credentials: SecureCredential): Promise<void> {
        try {
            await this.deleteCredentials(account);
        } catch (err) {
            Logger.getImperativeLogger().debug(`No previous secret ${this.secretName} found for deletion.`);
        }
        try {
            // Create K8s secret
            Logger.getImperativeLogger().debug(`Creating k8s secret as ${this.secretName}`);
            await this.kc.createNamespacedSecret(this.kubeConfig.namespace, {
                "apiVersion": "v1",
                "kind": "Secret",
                "metadata": {
                    "name": `${this.secretName}`,
                    "namespace": `${this.kubeConfig.namespace}`
                },
                "type": "Opaque",
                "data": {
                    "credentials": credentials
                }
            }, "true");
            Logger.getImperativeLogger().debug(`Successfully stored credentials as a kubernetes secret on namespace ${this.kubeConfig.namespace}`);
        } catch (err) {
            throw new ImperativeError({
                msg: `Error when saving k8s secret ${this.secretName}`,
                additionalDetails: err
            });
        }
    }

    /**
     * Calls the K8s API to delete secrets with {@link K8sCredentialManager#service} and the
     * account is passed to the function by Imperative.
     *
     * @param {string} account The account to set credentials
     *
     * @returns {Promise<void>} A promise that the function has completed.
     *
     * @throws {@link ImperativeError} if call to K8s API fails.
     */
    protected async deleteCredentials(account: string): Promise<void> {
        try {
            await this.readNamespacedSecret();
            Logger.getImperativeLogger().debug(`Deleting k8s secret ${this.secretName}`);
            await this.kc.deleteNamespacedSecret(this.secretName, this.kubeConfig.namespace, "true");
        } catch (err) {
            throw new ImperativeError({
                msg: `Failed to delete secret ${this.secretName} in namespace ${this.kubeConfig.namespace}`,
                additionalDetails: err.message
            });
        }
    }

    private get defaultService(): string {
        return this.allServices[0];
    }

    private getMissingEntryMessage(account: string) {
        let listOfServices = `  Service = `;
        for (const service of this.allServices) {
            listOfServices += `${service}, `;
        }
        const commaAndSpace = 2;
        listOfServices = listOfServices.slice(0, -1 * commaAndSpace) + `\n  Account = ${account}\n\n`;

        return "Could not find an entry in the credential vault for the following:\n" +
            listOfServices +
            "Possible Causes:\n" +
            "  This could have been caused by any manual removal of credentials from your vault.\n\n" +
            "Resolutions: \n" +
            "  Recreate the credentials in the vault for the particular service in the vault.\n";
    }

    /**
     * Retrieve data from kube config and return a {@link KubeConfig} object.
     *
     * @returns {k8s.CoreV1Api} the object allowing access to k8s api calls
     *
     * @throws {@link ImperativeError} if kube config file was not able to be opened.
     */
    private setupKubeConfig(): any {
        try {
            const kc: any = new k8s.KubeConfig();
            kc.loadFromDefault();

            // Check if login was performed
            const currentContextNamespace = kc.getContextObject(kc.getCurrentContext())?.namespace;
            const currentUser = kc.getCurrentUser();
            if(!currentContextNamespace || !currentUser) {
                throw new Error("Current context was not found, check if login command was performed.");
            }

            // Get namespace name from current context string from current login session
            // parse username for case where illegal characters are present
            let username = currentUser.name.split("/")[0];
            const email = /^\w+@[a-zA-Z_]+?\.[a-zA-Z]{2,3}$/;
            if(email.test(username)) {
                username = username.substring(0, username.indexOf("@"));
            } else {
                username = username.replace(/[^a-zA-Z0-9]/g, "");
            }

            // set all variables
            this.kubeConfig = {
                namespace: currentContextNamespace,
                username: username
            };

            return kc.makeApiClient(k8s.CoreV1Api);
        } catch (err) {
            throw new ImperativeError({ msg: err.message });
        }
    }

    /**
     * Create a new namespace in kubernetes cluster from the value of this.kubeConfig.namespace
     * @throws {@link ImperativeError} if an error is catched while making a request to the kubernetes API
     */
    private async createNamespace(): Promise<void> {
        try {
            await this.kc.createNamespace({
                apiVersion: "v1",
                metadata: {
                    name: this.kubeConfig.namespace
                }
            }, "true");
            Logger.getImperativeLogger().debug(`Namespace ${this.kubeConfig.namespace} was created successfully`);
        } catch (err) {
            throw new ImperativeError({ msg: err });
        }
    }

    /**
     * read a kubernetes secret from a specific namespace defined in kubeconfig
     * @param {boolean} optional whether or not we need the value to be returned
     * @throws {@link ImperativeError} if an error if secret was not found an optional was set to true
     * @returns {Promise<any>} an object representing the kubernetes secret
     */
    private async readNamespacedSecret(): Promise<any> {
        try {
            return await this.kc.readNamespacedSecret(this.secretName, this.kubeConfig.namespace, "true");
        } catch (err) {
            throw new ImperativeError({ msg: `${this.secretName} does not exist` });
        }
    }
}