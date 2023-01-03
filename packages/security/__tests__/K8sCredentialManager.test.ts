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

import { K8sCredentialManager } from "../src/K8sCredentialManager";
import { ImperativeError } from "../..";
jest.mock("@kubernetes/client-node");
const K8s = require("@kubernetes/client-node");

describe("K8sCredentialManager", () => {
    beforeEach(() => {
        jest.resetAllMocks();

        // Setup k8s.KubeConfig mocks
        const mockKubeConfig = jest.spyOn(K8s, "KubeConfig");
        mockKubeConfig.mockImplementation(() => {
            return {
                loadFromDefault: jest.fn(),
                getContextObject: jest.fn((context: string) => {
                    return {
                        "cluster": "api-sample-cluster-com:1234",
                        "namespace": "test",
                        "user": "testUser123@sample.com/api-sample-cluster-com:1234"
                    };
                }),
                getCurrentContext: jest.fn().mockImplementation(() => "test/sample-com:1234/testUser123@sample.com"),
                getCurrentUser: jest.fn(() => {
                    return {
                        "name": "testUser123@sample.com/api-sample-cluster-com:1234",
                        "user": {
                            "client-certificate": "sample/path/client.crt",
                            "client-key": "sample/path/client.key"
                        }
                    };
                }),
                makeApiClient: jest.fn(() => {
                    return {
                        readNamespace: jest.fn(),
                        createNamespace: jest.fn(),
                        readNamespacedSecret: jest.fn(),
                        deleteNamespacedSecret: jest.fn(),
                        createNamespacedSecret: jest.fn()
                    };
                })
            };
        });
    });

    it("Constructs Properly", () => {
        const service = "imperative";
        const manager = new K8sCredentialManager(service);
        const privateManager = manager as any;
        expect((manager as any).service).toEqual(service);
    });

    describe("instance methods", () => {
        const service = K8sCredentialManager.SVC_NAME;
        let manager: K8sCredentialManager;
        let privateManager: any;
        const values = {
            account: "test",
            credentials: "someUser:somePassword"
        };

        beforeEach(() => {
            manager = new K8sCredentialManager(service);
            privateManager = manager as any;
        });

        describe("initialize", () => {
            it("should throw an authentication error if user has not logged into kubernetes with error 403", async () => {
                const expectedValue = "Authentication error when trying to access kubernetes cluster. Login to cluster and try again.";
                privateManager.kc.readNamespace = jest.fn((namespace: string, pretty: string) => {
                    const error = new Error(expectedValue);
                    Object.defineProperty(error, "statusCode", {
                        value: 403,
                        writable: false
                    });
                    throw error;
                });
                await expect(manager.initialize()).rejects.toThrow(expectedValue);
            });
            it("should throw an authentication error if user has not logged into kubernetes with error 401", async () => {
                const expectedValue = "Authentication error when trying to access kubernetes cluster. Login to cluster and try again.";
                privateManager.kc.readNamespace = jest.fn((namespace: string, pretty: string) => {
                    const error = new Error(expectedValue);
                    Object.defineProperty(error, "statusCode", {
                        value: 401,
                        writable: false
                    });
                    throw error;
                });
                await expect(manager.initialize()).rejects.toThrow(expectedValue);
            });
            it("should properly check if namespace exists in kubernetes cluster and find it", async () => {
                await expect(manager.initialize()).resolves.not.toThrow();
            });
            it("Should throw an error if the namespace defined does not exist in cluster", async () => {
                privateManager.kc.readNamespace = jest.fn((namespace: string, pretty: string) => {
                    throw new Error("Namespace not found");
                });
                await expect(manager.initialize()).rejects.toThrow();
            });
        });

        describe("setupKubeConfig", () => {
            it("should throw an error if the current context is not found", async () => {
                const mockKubeConfig = jest.spyOn(K8s, "KubeConfig");
                mockKubeConfig.mockImplementation(() => {
                    return {
                        loadFromDefault: jest.fn(),
                        getContextObject: jest.fn(() => null),
                        getCurrentContext: jest.fn(() => null),
                        getCurrentUser: jest.fn(() => null)
                    };
                });
                expect(() => privateManager.setupKubeConfig()).toThrow();
            });
            it("should create a uid associated with the kubeconfig email", async () => {
                const mockKubeConfig = jest.spyOn(K8s, "KubeConfig");
                mockKubeConfig.mockImplementation(() => {
                    return {
                        loadFromDefault: jest.fn(),
                        getContextObject: jest.fn((context: string) => {
                            return {
                                "cluster": "api-sample-cluster-com:1234",
                                "namespace": "test",
                                "user": "test_User123@sample.com/api-sample-cluster-com:1234"
                            };
                        }),
                        getCurrentContext: jest.fn().mockImplementation(() => "test/sample-com:1234/test_User123@sample.com"),
                        getCurrentUser: jest.fn(() => {
                            return {
                                "name": "test_User123@sample.com/api-sample-cluster-com:1234",
                                "user": {
                                    "client-certificate": "sample/path/client.crt",
                                    "client-key": "sample/path/client.key"
                                }
                            };
                        }),
                        makeApiClient: jest.fn(),
                    };
                });
                privateManager.setupKubeConfig();

                const expectedResult = Buffer.from("test_User123@sample.com", "binary").toString("base64").toLowerCase().replace(/=/g, "");
                expect(privateManager.kubeConfig.uid).toMatch(expectedResult);
            });
            it("should throw an error if KubeConfig was not able to be accessed from Kubernetes", async () => {
                const mockKubeConfig = jest.spyOn(K8s, "KubeConfig");
                mockKubeConfig.mockImplementation(() => {
                    throw new Error("No information available on KubeConfig");
                });
                expect(() => privateManager.setupKubeConfig()).toThrow();
            });
        });

        describe("loadCredentials", () => {
            it("should return secret if credentials exists in kubernetes", async () => {
                const expectedValue = Buffer.from(values.credentials, "base64").toString();
                privateManager.kc.readNamespacedSecret = jest.fn(() => {
                    return {
                        body: {
                            data: {
                                credentials: values.credentials
                            }
                        }
                    };
                });

                await expect(manager.load("secure_props_test")).resolves.toEqual(expectedValue);
            });
            it("should throw an error when required credential fails to load", async () => {
                let caughtError: ImperativeError | undefined = undefined;
                privateManager.kc.readNamespacedSecret = jest.fn(() => null);

                try {
                    await privateManager.loadCredentials(values.account);
                } catch (error) {
                    caughtError = error;
                }

                expect(caughtError?.message).toEqual("Unable to load credentials.");
                expect((caughtError as ImperativeError).additionalDetails).toContain(values.account);
                expect((caughtError as ImperativeError).additionalDetails).toContain(service);
            });

            it("should not throw an error when optional credential fails to load", async () => {
                let result;
                let caughtError: ImperativeError | undefined = undefined;
                privateManager.kc.readNamespacedSecret = jest.fn(() => null);

                try {
                    result = await privateManager.loadCredentials(values.account, true);
                } catch (error) {
                    caughtError = error;
                }

                expect(result).toBeNull();
                expect(caughtError).toBeUndefined();
            });
        });

        describe("saveCredentials", () => {
            it("should save a kubernetes secret successfully if credentials are not found", async () => {
                privateManager.kc.readNamespacedSecret = jest.fn(() => {
                    throw new Error("Failed to load secret");
                });
                await expect(manager.save(values.account, values.credentials)).resolves.not.toThrow();
            });
            it("should save a kubernetes secret successfully if credentials are found and deleted",async () => {
                await expect(manager.save(values.account, values.credentials)).resolves.not.toThrow();
            });
            it("should throw an error if a secret was not able to be stored", async () => {
                privateManager.kc.createNamespacedSecret = jest.fn(() => {
                    throw new Error("Failed to save secret");
                });
                await expect(manager.save(values.account, values.credentials)).rejects.toThrow();
            });
        });

        describe("deleteCredentials", () => {
            it("should delete a kubernetes secret successfully if the secret exists", async () => {
                await expect(manager.delete(values.account)).resolves.not.toThrow();
            });
            it("should fail to delete a kubernetes secret if secret is not found and throw an error", async () => {
                privateManager.kc.deleteNamespacedSecret = jest.fn(() => {
                    throw new Error("Failed to delete secret");
                });
                await expect(manager.delete(values.account)).rejects.toThrow();
            });
        });
    });
});