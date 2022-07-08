/**
 * Web help genrator API that handles genration of web diff base launcher
 * at cli home dir
 * @export
 * @interface IWebDiffGenerator
 */
export interface IWebDiffGenerator {

    /**
     * build the diff generator
     */
    buildDiffDir(): void;

}
