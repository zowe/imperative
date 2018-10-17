import { ImperativeError } from "../src/ImperativeError";
import * as chalk from "chalk";

describe("ImperativeError", () => {
    it("should deprecate suppressReport", () => {
        jest.spyOn(console, "warn").mockImplementation(() => { return; });

        // tslint:disable-next-line
        new ImperativeError({msg: "test"}, {suppressReport: false });

        expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("[DEPRECATED]"));

        (console.warn as any).mockRestore();

        jest.spyOn(console, "warn").mockImplementation(() => { return; });

        // tslint:disable-next-line
        new ImperativeError({msg: "test"}, {suppressReport: true });

        expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("[DEPRECATED]"));

        (console.warn as any).mockRestore();
    });

    it("should not throw any deprecation warnings", () => {
        jest.spyOn(console, "warn").mockImplementation(() => { return; });

        // tslint:disable-next-line
        new ImperativeError({msg: "test"});

        // tslint:disable-next-line
        new ImperativeError({msg: "test"}, {
            tag: "test"
        });

        expect(console.warn).not.toHaveBeenCalled();

        (console.warn as any).mockRestore();
    });
});
