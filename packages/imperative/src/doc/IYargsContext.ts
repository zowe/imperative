import * as net from "net";


/**
 * Allow for passing our own "context" / user data through yargs
 * @export
 * @interface IYargsContext
 */
export interface IYargsContext {

    /**
     * Stream to write response to
     * @type {net.Socket}
     * @memberof IYargsContext
     */
    stream?: net.Socket;

    /**
     * Current working directory from socket client
     * @type {string}
     * @memberof IYargsContext
     */
    cwd?: string;
};