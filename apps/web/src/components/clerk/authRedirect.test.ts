import { describe, expect, it } from "vite-plus/test";

import { resolveClerkSignInProps } from "./authRedirect";

describe("resolveClerkSignInProps", () => {
  it("returns to the current browser URL on the web", () => {
    const href = "https://app.piedpiperapp.com/connect?state=state-1#details";
    expect(resolveClerkSignInProps(href, false)).toEqual({
      forceRedirectUrl: href,
      signUpForceRedirectUrl: href,
    });
  });

  it("removes a Clerk virtual pathname and callback params while preserving the desktop route", () => {
    expect(
      resolveClerkSignInProps(
        "piedpiperapp://app/CLERK-ROUTER/VIRTUAL/sign-up?__clerk_status=complete#/settings/connections",
        true,
      ),
    ).toEqual({
      forceRedirectUrl: "piedpiperapp://app/#/settings/connections",
      signUpForceRedirectUrl: "piedpiperapp://app/#/settings/connections",
    });
  });

  it("preserves a clean development desktop route", () => {
    expect(resolveClerkSignInProps("piedpiperapp-dev://app/#/settings/general", true)).toEqual({
      forceRedirectUrl: "piedpiperapp-dev://app/#/settings/general",
      signUpForceRedirectUrl: "piedpiperapp-dev://app/#/settings/general",
    });
  });
});
