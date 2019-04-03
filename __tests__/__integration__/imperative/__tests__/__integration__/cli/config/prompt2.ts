import * as fs from "fs";

const suppose = require("suppose");
const PROMPT: string = "prompt*";

console.log("TEST");
process.chdir(__dirname + "/");
fs.writeFileSync(__dirname + "/README.md", "READ IT");

console.log("READ.MD");
// debug is an optional writable output stream
suppose("zowe", ["files", "list", "ds", PROMPT,  "--zosmf-p", "ca32"],
  {debug: fs.createWriteStream(__dirname + "/prompt.md")})
  .when(`Please enter "configValue":`).respond("swawi03.clist")
  .on("error", (err: any) => {
    console.log(err);
  })
  .end((code: any) => {
      console.log("PROMPT END");
      // const packageFile = __dirname + "/package.json";
      // fs.readFile(packageFile, (err, data) => {
      //   const packageObj = JSON.parse(data.toString());
      //   console.log(packageObj);
      // });
  });
