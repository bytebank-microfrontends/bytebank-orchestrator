/* eslint-env jest, node */
import fs from "fs";
import path from "path";
import { navigateToUrl } from "single-spa";
import { getMockAuthSession, subscribeMockAuthSession } from "@bytebank/util";
import {
  enforceMockAuthNavigation,
  getMockAuthNavigationTarget,
  LOGIN_PATH,
  ORCHESTRATOR_ROOT_PATH,
  setupMockAuthNavigationGuard,
} from "./mock-auth-navigation";

jest.mock("single-spa", () => ({
  navigateToUrl: jest.fn(),
}));

jest.mock(
  "@bytebank/util",
  () => ({
    getMockAuthSession: jest.fn(),
    subscribeMockAuthSession: jest.fn(),
  }),
  { virtual: true }
);

describe("mock auth navigation guard", () => {
  beforeEach(() => {
    navigateToUrl.mockClear();
    getMockAuthSession.mockReset();
    subscribeMockAuthSession.mockReset();
  });

  afterEach(() => {
    delete global.window;
  });

  it("redirects from the orchestrator root to login without a session", () => {
    expect(
      getMockAuthNavigationTarget({
        pathname: ORCHESTRATOR_ROOT_PATH,
        session: null,
      })
    ).toBe(LOGIN_PATH);
  });

  it("redirects from private routes to login without a session", () => {
    [
      "/bytebank-orchestrator/account",
      "/bytebank-orchestrator/transaction",
      "/bytebank-orchestrator/cards",
    ].forEach((pathname) => {
      expect(
        getMockAuthNavigationTarget({
          pathname,
          session: null,
        })
      ).toBe(LOGIN_PATH);
    });
  });

  it("allows the dashboard with a session", () => {
    expect(
      getMockAuthNavigationTarget({
        pathname: ORCHESTRATOR_ROOT_PATH,
        session: { user: "Ada" },
      })
    ).toBeNull();
  });

  it("redirects authenticated users from login to the orchestrator root", () => {
    expect(
      getMockAuthNavigationTarget({
        pathname: LOGIN_PATH,
        session: { user: "Ada" },
      })
    ).toBe(ORCHESTRATOR_ROOT_PATH);
  });

  it("does not navigate when already on an allowed route", () => {
    const targetPath = enforceMockAuthNavigation({
      pathname: LOGIN_PATH,
      session: null,
    });

    expect(targetPath).toBeNull();
    expect(navigateToUrl).not.toHaveBeenCalled();
  });

  it("subscribes to mock session changes and reevaluates the current route", () => {
    let sessionListener;
    const unsubscribe = jest.fn();

    global.window = {
      addEventListener: jest.fn(),
      location: {
        pathname: "/bytebank-orchestrator/account",
      },
      removeEventListener: jest.fn(),
    };
    getMockAuthSession.mockReturnValue(null);
    subscribeMockAuthSession.mockImplementation((listener) => {
      sessionListener = listener;
      return unsubscribe;
    });

    const teardownGuard = setupMockAuthNavigationGuard();

    expect(navigateToUrl).toHaveBeenCalledWith(LOGIN_PATH);

    navigateToUrl.mockClear();
    getMockAuthSession.mockReturnValue({ user: "Ada" });
    global.window.location.pathname = LOGIN_PATH;

    sessionListener();

    expect(navigateToUrl).toHaveBeenCalledWith(ORCHESTRATOR_ROOT_PATH);

    teardownGuard();
    expect(unsubscribe).toHaveBeenCalled();
    expect(window.removeEventListener).toHaveBeenCalledWith(
      "single-spa:routing-event",
      expect.any(Function)
    );
  });

  it("reevaluates route changes handled by single-spa", () => {
    let routingListener;

    global.window = {
      addEventListener: jest.fn((eventName, listener) => {
        if (eventName === "single-spa:routing-event") {
          routingListener = listener;
        }
      }),
      location: {
        pathname: LOGIN_PATH,
      },
      removeEventListener: jest.fn(),
    };
    getMockAuthSession.mockReturnValue(null);
    subscribeMockAuthSession.mockReturnValue(jest.fn());

    setupMockAuthNavigationGuard();
    navigateToUrl.mockClear();

    global.window.location.pathname = "/bytebank-orchestrator/cards";
    routingListener();

    expect(navigateToUrl).toHaveBeenCalledWith(LOGIN_PATH);
  });

  it("does not introduce browser persistence or credential artifacts", () => {
    const guardSource = fs.readFileSync(
      path.resolve(__dirname, "mock-auth-navigation.js"),
      "utf8"
    );

    expect(guardSource).not.toMatch(
      /localStorage|sessionStorage|document\.cookie|\bcookie\b|\bjwt\b|\btoken\b|SystemJS|window\.location\.href/i
    );
  });
});
