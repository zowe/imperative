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

import { ProcessUtils } from "../../utilities";

describe("ProcessUtils tests", () => {

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
