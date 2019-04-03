import * as fs from "fs";

const suppose = require("suppose");
// const assert = require("assert");
// this.console.info("TEST");

console.log("TEST");
process.chdir(__dirname + "/");
fs.writeFileSync(__dirname + "/README.md", "READ IT");
try {
  fs.unlinkSync( __dirname + "/package.json");
}
catch (e) {
  console.log(e);
}
console.log("READ.MD");
// debug is an optional writable output stream
suppose("npm", ["init"], {debug: fs.createWriteStream(__dirname + "/README.md")})
  .when(/name\: \([\w|\-]+\)[\s]*/).respond("awesome_package\n")
  .when("version: (1.0.0) ").respond("0.0.1\n")
// response can also bnpm e the second argument to .when
  .when("description: ", "It's an awesome package man!\n")
  .when("entry point: (prompt.js) ").respond("\n")
  .when("test command: ").respond("npm test\n")
  .when("git repository: ").respond("\n")
  .when("keywords: ").respond("awesomely, cool\n")
  .when("author: ").respond("JP Richardson\n")
  .when("license: (ISC) ").respond("MIT\n")
  .when("Is this OK? (yes) " ).respond("yes\n")
  .on("error", (err: any) => {
    console.log(err);
  })
  .end((code: any) => {
    console.log("PROMPT END");
    const packageFile = __dirname + "/package.json";
    fs.readFile(packageFile, (err, data) => {
      const packageObj = JSON.parse(data.toString());
      console.log(packageObj);
    });
  });
