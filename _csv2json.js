const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse");
let jsondata = {};
fs.createReadStream("./bazahei_airdrop_spreadsheet - Sheet1.csv")
  .pipe(parse({ delimiter: "," }))
  .on("data", function (row) {
    jsondata[row[0]] = {
      principalID: row[1],
      ic_url: `https://d6tnr-oqaaa-aaaai-aclxa-cai.ic0.app/ic/${row[0]}_ICP.png`,
      xrp_url: `https://d6tnr-oqaaa-aaaai-aclxa-cai.ic0.app/xrp/${row[0]}_XRP.png`,
    };
  })
  .on("end", () => {
    console.log(jsondata);
    jsondata = JSON.stringify(jsondata);
    let save = path.format({
      dir: "./",
      name: "mintInfo",
      ext: ".json",
    });
    fs.writeFile(save, jsondata, (err) => {
      if (err) throw err;
      console.log("Done");
    });
  });
