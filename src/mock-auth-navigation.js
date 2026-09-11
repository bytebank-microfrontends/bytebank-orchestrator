import { navigateToUrl } from "single-spa";
import { getMockAuthSession, subscribeMockAuthSession } from "@bytebank/util";

export const ORCHESTRATOR_ROOT_PATH = "/bytebank-orchestrator/";
export const LOGIN_PATH = "/bytebank-orchestrator/login";

const ORCHESTRATOR_ROOT_WITHOUT_SLASH = "/bytebank-orchestrator";
const PRIVATE_EXACT_PATHS = [
  ORCHESTRATOR_ROOT_PATH,
  "/bytebank-orchestrator/account",
];
const PRIVATE_PREFIX_PATHS = [
  "/bytebank-orchestrator/transaction",
  "/bytebank-orchestrator/cards",
];

function normalizePathname(pathname) {
  if (pathname === ORCHESTRATOR_ROOT_WITHOUT_SLASH) {
    return ORCHESTRATOR_ROOT_PATH;
  }

  if (
    pathname !== ORCHESTRATOR_ROOT_PATH &&
    pathname.length > 1 &&
    pathname.endsWith("/")
  ) {
    return pathname.slice(0, -1);
  }

  return pathname;
}

export function isPrivateRoute(pathname) {
  const normalizedPathname = normalizePathname(pathname);

  return (
    PRIVATE_EXACT_PATHS.includes(normalizedPathname) ||
    PRIVATE_PREFIX_PATHS.some(
      (privatePath) =>
        normalizedPathname === privatePath ||
        normalizedPathname.startsWith(`${privatePath}/`)
    )
  );
}

export function getMockAuthNavigationTarget({ pathname, session }) {
  const normalizedPathname = normalizePathname(pathname);
  const isAuthenticated = session?.authenticated === true;

  if (!isAuthenticated && isPrivateRoute(normalizedPathname)) {
    return LOGIN_PATH;
  }

  if (isAuthenticated && normalizedPathname === LOGIN_PATH) {
    return ORCHESTRATOR_ROOT_PATH;
  }

  return null;
}

export function enforceMockAuthNavigation({
  pathname = window.location.pathname,
  session = getMockAuthSession(),
  navigate = navigateToUrl,
} = {}) {
  const targetPath = getMockAuthNavigationTarget({ pathname, session });

  if (!targetPath || normalizePathname(pathname) === targetPath) {
    return null;
  }

  navigate(targetPath);
  return targetPath;
}

export function setupMockAuthNavigationGuard() {
  const reevaluateCurrentRoute = () => {
    enforceMockAuthNavigation();
  };

  enforceMockAuthNavigation();

  const unsubscribeMockAuthSession = subscribeMockAuthSession(
    reevaluateCurrentRoute
  );

  window.addEventListener("single-spa:routing-event", reevaluateCurrentRoute);

  return () => {
    unsubscribeMockAuthSession();
    window.removeEventListener(
      "single-spa:routing-event",
      reevaluateCurrentRoute
    );
  };
}
