import { describe, it, expect } from "vitest";
import {
  detectStateFromAddress,
  getRecommendedMlsLimit,
  autoTrimToLimit,
} from "./mlsLimits";

describe("mlsLimits utility", () => {
  describe("detectStateFromAddress", () => {
    it("detects 2-letter state codes", () => {
      expect(detectStateFromAddress("123 Main St, Austin, TX 78701")).toBe("TX");
      expect(detectStateFromAddress("742 Evergreen Terrace, Springfield, IL")).toBe("IL");
      expect(detectStateFromAddress("1600 Pennsylvania Ave NW, Washington, DC 20500")).toBe("DC");
      expect(detectStateFromAddress("100 Market St, Philadelphia, PA 19106")).toBe("PA");
    });

    it("detects full state names", () => {
      expect(detectStateFromAddress("456 Ocean Dr, Miami, Florida")).toBe("FL");
      expect(detectStateFromAddress("10 Sunset Blvd, Los Angeles, California 90028")).toBe("CA");
    });

    it("returns null for non-matching or empty strings", () => {
      expect(detectStateFromAddress("")).toBeNull();
      expect(detectStateFromAddress(null)).toBeNull();
      expect(detectStateFromAddress("Just a random sentence")).toBeNull();
    });
  });

  describe("getRecommendedMlsLimit", () => {
    it("assigns 1024 for Bright MLS states like PA and NJ", () => {
      expect(getRecommendedMlsLimit("Philadelphia, PA").limit).toBe(1024);
      expect(getRecommendedMlsLimit("Cherry Hill, NJ").limit).toBe(1024);
      expect(getRecommendedMlsLimit("Baltimore, MD").limit).toBe(1024);
    });

    it("assigns 1000 for standard MLS states like TX or CA", () => {
      expect(getRecommendedMlsLimit("Austin, TX").limit).toBe(1000);
      expect(getRecommendedMlsLimit("Los Angeles, CA").limit).toBe(1000);
    });
  });

  describe("autoTrimToLimit", () => {
    it("returns unchanged text if under limit", () => {
      const text = "Beautiful 3-bed home. Great yard.";
      expect(autoTrimToLimit(text, 100)).toBe(text);
    });

    it("trims at sentence boundary when reasonable", () => {
      const text = "First sentence here. Second sentence follows. Third sentence wraps up.";
      // Limit 50 chars will cut into the second or third sentence
      const trimmed = autoTrimToLimit(text, 50);
      expect(trimmed).toBe("First sentence here. Second sentence follows.");
      expect(trimmed.length).toBeLessThanOrEqual(50);
    });
  });
});
