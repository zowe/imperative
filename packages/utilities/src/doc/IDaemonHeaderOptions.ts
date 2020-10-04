
/**
 * Option interface to construct headers for daemon mode protocol
 * @export
 * @interface IDaemonHeaderOptions
 */
export interface IDaemonHeaderOptions {

    /**
     * Process exit code
     * @type {number}
     * @memberof IDaemonHeaderOptions
     */
    exitCode?: number;

    /**
     * Indicator for prompting
     * @type {boolean}
     * @memberof IDaemonHeaderOptions
     */
    prompt?: boolean;

    /**
     * Content is for stdout
     * @type {boolean}
     * @memberof IDaemonHeaderOptions
     */
    stdout?: boolean;

    /**
     * Content is for stderr
     * @type {boolean}
     * @memberof IDaemonHeaderOptions
     */
    stderr?: boolean;
}