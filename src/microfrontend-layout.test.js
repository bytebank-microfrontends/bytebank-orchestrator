/* eslint-env jest, node */
import fs from "fs";
import path from "path";

const layout = fs.readFileSync(
  path.resolve(__dirname, "microfrontend-layout.html"),
  "utf8"
);

function routeBlock(pathAttribute) {
  const pattern = new RegExp(
    `<route ${pathAttribute}[\\s\\S]*?<\\/route>`,
    "m"
  );

  return layout.match(pattern)[0];
}

describe("microfrontend layout routing", () => {
  it("routes login to auth without mounting navbar", () => {
    const loginRoute = routeBlock('path="/bytebank-orchestrator/login" exact');

    expect(loginRoute).toContain('name="@bytebank/auth"');
    expect(loginRoute).not.toContain('name="@bytebank/navbar"');
  });

  it("keeps dashboard on the orchestrator root with navbar", () => {
    const dashboardRoute = routeBlock('path="/bytebank-orchestrator/" exact');

    expect(dashboardRoute).toContain('name="@bytebank/navbar"');
    expect(dashboardRoute).toContain('name="@bytebank/dashboard"');
  });

  it("keeps default route on not-found", () => {
    const defaultRoute = routeBlock("default");

    expect(defaultRoute).toContain('name="@bytebank/not-found"');
  });
});
