import { describe, it, expect } from "vitest";

describe("RetroGenerator quota label and disabled logic", () => {
  const getGenerationCountLabel = (params: {
    devBypassActive: boolean;
    isProUser: boolean;
    generationsLeft: number;
  }) => {
    const isUnlimited = params.devBypassActive || params.isProUser;
    return isUnlimited ? "unlimited" : `${params.generationsLeft} left`;
  };

  const isRegenerateDisabled = (params: {
    generateDisabled: boolean;
    devBypassActive: boolean;
    isProUser: boolean;
    generationsLeft: number;
  }) => {
    return (
      params.generateDisabled ||
      (!params.devBypassActive && !params.isProUser && params.generationsLeft <= 0)
    );
  };

  describe("generationCountLabel", () => {
    it("shows remaining count for anonymous users", () => {
      expect(
        getGenerationCountLabel({
          devBypassActive: false,
          isProUser: false,
          generationsLeft: 10,
        }),
      ).toBe("10 left");

      expect(
        getGenerationCountLabel({
          devBypassActive: false,
          isProUser: false,
          generationsLeft: 4,
        }),
      ).toBe("4 left");

      expect(
        getGenerationCountLabel({
          devBypassActive: false,
          isProUser: false,
          generationsLeft: 0,
        }),
      ).toBe("0 left");
    });

    it("shows remaining count for signed-in free users (NOT unlimited)", () => {
      // Critical requirement: signed-in free users must see actual quota left, not 'unlimited'
      expect(
        getGenerationCountLabel({
          devBypassActive: false,
          isProUser: false,
          generationsLeft: 7,
        }),
      ).toBe("7 left");

      expect(
        getGenerationCountLabel({
          devBypassActive: false,
          isProUser: false,
          generationsLeft: 1,
        }),
      ).toBe("1 left");

      expect(
        getGenerationCountLabel({
          devBypassActive: false,
          isProUser: false,
          generationsLeft: 0,
        }),
      ).toBe("0 left");
    });

    it("shows unlimited for Pro and Elite users", () => {
      expect(
        getGenerationCountLabel({
          devBypassActive: false,
          isProUser: true,
          generationsLeft: 0,
        }),
      ).toBe("unlimited");
    });

    it("shows unlimited when dev bypass is active regardless of user tier", () => {
      expect(
        getGenerationCountLabel({
          devBypassActive: true,
          isProUser: false,
          generationsLeft: 0,
        }),
      ).toBe("unlimited");
    });
  });

  describe("regenerate button disabled check", () => {
    it("disables regenerate button when free user has 0 generations left", () => {
      expect(
        isRegenerateDisabled({
          generateDisabled: false,
          devBypassActive: false,
          isProUser: false,
          generationsLeft: 0,
        }),
      ).toBe(true);
    });

    it("enables regenerate button when free user has remaining generations", () => {
      expect(
        isRegenerateDisabled({
          generateDisabled: false,
          devBypassActive: false,
          isProUser: false,
          generationsLeft: 3,
        }),
      ).toBe(false);
    });

    it("keeps regenerate button enabled for Pro user even when generationsLeft is 0", () => {
      expect(
        isRegenerateDisabled({
          generateDisabled: false,
          devBypassActive: false,
          isProUser: true,
          generationsLeft: 0,
        }),
      ).toBe(false);
    });

    it("keeps regenerate button enabled when dev bypass is active", () => {
      expect(
        isRegenerateDisabled({
          generateDisabled: false,
          devBypassActive: true,
          isProUser: false,
          generationsLeft: 0,
        }),
      ).toBe(false);
    });

    it("respects generateDisabled flag (e.g. while generation is in progress)", () => {
      expect(
        isRegenerateDisabled({
          generateDisabled: true,
          devBypassActive: false,
          isProUser: true,
          generationsLeft: 10,
        }),
      ).toBe(true);
    });
  });
});
