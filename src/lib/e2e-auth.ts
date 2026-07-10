export function isE2eAuthBypassEnabled() {
  return process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS === "true";
}

export function getE2eAuthUser() {
  return {
    userId: process.env.NEXT_PUBLIC_E2E_USER_ID || "e2e-user",
    email: process.env.NEXT_PUBLIC_E2E_USER_EMAIL || "e2e@example.com",
    name: process.env.NEXT_PUBLIC_E2E_USER_NAME || "E2E User",
  };
}
