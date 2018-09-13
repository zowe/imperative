import {IQueuedMessage} from "./doc/IQueuedMessage";
import {Logger} from "./Logger";

export class LoggerStatus {

    private static mInstance: LoggerStatus = null;

    public static get instance(): LoggerStatus {
        if (this.mInstance == null) {
            this.mInstance = new LoggerStatus();
        }

        return this.mInstance;
    }

    private mIsLoggerInit: boolean = false;
    private mMsgMessages: IQueuedMessage[] = [];

    public get isLoggerInit(): boolean {
        return this.mIsLoggerInit;
    }

    public set isLoggerInit(status: boolean) {
        this.mIsLoggerInit = status;
    }

    public queueMessage(category: string, method: string, message: string){
        this.mMsgMessages.unshift({
            category,
            method,
            message
        });
    }

    public get QueuedMessages(): IQueuedMessage[] {
        return this.mMsgMessages;
    }


}
