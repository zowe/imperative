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

import { GuiResult, ProcessUtils } from "../../utilities";

describe("ProcessUtils tests", () => {
    describe("nextTick", () => {

        it("should invoke all next ticks in the proper order", async () => {
            const chicken = "chicken";
            const cat = "cat";
            const dog = "dog";
            const pig = "pig";
            const horse = "horse";

            let animal = chicken;

            const setCat = () => animal = cat;
            const setDog = () => animal = dog;
            const setPig = () => animal = pig;

            await ProcessUtils.nextTick(setCat);
            expect(animal).toBe(cat);

            animal = horse;
            const dogPromise = ProcessUtils.nextTick(setDog);
            expect(animal).toBe(horse);

            await dogPromise;
            expect(animal).toBe(dog);

            await ProcessUtils.nextTick(setPig);
            expect(animal).toBe(pig);
        });
    });

    describe("isGuiAvailable", () => {
        (process.platform !== "linux" ? it : it.skip)("should report a GUI on Windows or Mac", async () => {
            expect(ProcessUtils.isGuiAvailable()).toBe(GuiResult.GUI_AVAILABLE);
        });

        it("should report no GUI on an ssh connection", async () => {
            process.env.SSH_CONNECTION = "AnyValue";
            expect(ProcessUtils.isGuiAvailable()).toBe(GuiResult.NO_GUI_SSH);
        });

        it("should report a GUI if DISPLAY is set on Linux", async () => {
            const realPlatform = process.platform;
            Object.defineProperty(process, "platform", {
                value: "linux"
            });

            const realEnv = process.env;
            Object.defineProperty(process, "env", {
                value: {
                    DISPLAY: "xterm"
                }
            });

            expect(ProcessUtils.isGuiAvailable()).toBe(GuiResult.GUI_AVAILABLE);

            // restore values
            Object.defineProperty(process, "platform", {
                value: realPlatform
            });
            Object.defineProperty(process, "env", {
                value: realEnv
            });
        });

        it("should report no GUI if DISPLAY is not set on Linux", async () => {
            const realPlatform = process.platform;
            Object.defineProperty(process, "platform", {
                value: "linux"
            });

            const realEnv = process.env;
            Object.defineProperty(process, "env", {
                value: {
                    DISPLAY: ""
                }
            });

            process.env.DISPLAY = "";
            expect(ProcessUtils.isGuiAvailable()).toBe(GuiResult.NO_GUI_NO_DISPLAY);

            // restore values
            Object.defineProperty(process, "platform", {
                value: realPlatform
            });
            Object.defineProperty(process, "env", {
                value: realEnv
            });
        });
    });

});
