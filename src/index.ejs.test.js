/* eslint-env jest, node */
import fs from "fs";
import path from "path";

const template = fs.readFileSync(path.resolve(__dirname, "index.ejs"), "utf8");

function expectCspDirective(cspName, directive) {
  expect(template).toContain(`"${directive}"`);
  expect(template).toContain(`const ${cspName} = [`);
}

describe("index.ejs security policy", () => {
  it("keeps production CSP restricted to the required origins", () => {
    expectCspDirective("productionCsp", "default-src 'self'");
    expectCspDirective(
      "productionCsp",
      "script-src 'self' 'unsafe-inline' https://bytebank-microfrontends.github.io https://cdn.jsdelivr.net"
    );
    expectCspDirective("productionCsp", "connect-src 'self'");
    expectCspDirective("productionCsp", "style-src 'self' 'unsafe-inline'");
    expectCspDirective(
      "productionCsp",
      "img-src 'self' data: https://bytebank-microfrontends.github.io"
    );
    expectCspDirective("productionCsp", "font-src 'self' data:");
    expectCspDirective("productionCsp", "object-src 'none'");
    expectCspDirective("productionCsp", "base-uri 'self'");
    expectCspDirective("productionCsp", "form-action 'self'");

    const productionCspBlock = template.match(
      /const productionCsp = \[[\s\S]*?\]\.join\("; "\);/
    )[0];

    expect(productionCspBlock).not.toContain("'unsafe-eval'");
    expect(productionCspBlock).not.toMatch(/\shttps:(?!\/\/)/);
    expect(productionCspBlock).not.toContain("localhost");
    expect(productionCspBlock).not.toContain("*");
  });

  it("keeps import-map-overrides available only for local development", () => {
    expect(template).toMatch(
      /<% if \(isLocal\) { %>\s*<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/import-map-overrides@5\.1\.1\/dist\/import-map-overrides\.js"><\/script>\s*<% } %>/
    );
    expect(template).toMatch(
      /<% if \(isLocal\) { %>\s*<import-map-overrides-full show-when-local-storage="devtools" dev-libs><\/import-map-overrides-full>\s*<% } %>/
    );
  });
});
