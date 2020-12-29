import { BaseAuthHandler } from "../../handlers/BaseAuthHandler";
import { ICommandArguments } from "../../../../../cmd";
import { ISession, AbstractSession, SessConstants } from "../../../../../rest";

export class FakeAuthHandler extends BaseAuthHandler {
    public mProfileType: string = "fruit";

    public mDefaultTokenType: SessConstants.TOKEN_TYPE_CHOICES = SessConstants.TOKEN_TYPE_JWT;

    protected createSessCfgFromArgs(args: ICommandArguments): ISession {
        return { hostname: "fakeHost", port: 3000 };
    }

    protected async doLogin(session: AbstractSession): Promise<string> {
        return "fakeToken";
    }

    protected async doLogout(session: AbstractSession): Promise<void> { /* Do nothing */ }
}
