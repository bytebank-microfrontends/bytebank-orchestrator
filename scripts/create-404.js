const fs = require("fs");
const path = require("path");

const distPath = path.resolve(__dirname, "../dist");

fs.copyFileSync(
  path.join(distPath, "index.html"),
  path.join(distPath, "404.html")
);

console.log("404.html created successfully");
