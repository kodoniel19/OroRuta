const {
  calculateTraditionalFare,
  roundToNearestQuarter,
  isTraditionalJeepney
} = require("../src/services/fareService");

describe("Traditional Jeepney Fare Calculation (LTFRB PUJ Fare Guide Oct 8, 2023)", () => {

  describe("Base Fare (Distances <= 4.0 km)", () => {
    test("Distance below 4 km (2.5 km) charges base fare", () => {
      const res = calculateTraditionalFare(2.5, "Regular");
      expect(res.isAvailable).toBe(true);
      expect(res.regularFare).toBe(13.00);
      expect(res.discountedFare).toBe(10.40);
      expect(res.selectedCategoryFare).toBe(13.00);
    });

    test("Distance exactly 4.0 km charges base fare", () => {
      const reg = calculateTraditionalFare(4.0, "Regular");
      expect(reg.regularFare).toBe(13.00);
      expect(reg.discountedFare).toBe(10.40);

      const stu = calculateTraditionalFare(4.0, "Student");
      expect(stu.selectedCategoryFare).toBe(10.40);

      const sen = calculateTraditionalFare(4.0, "Senior citizen");
      expect(sen.selectedCategoryFare).toBe(10.40);

      const pwd = calculateTraditionalFare(4.0, "PWD");
      expect(pwd.selectedCategoryFare).toBe(10.40);
    });
  });

  describe("Succeeding Distance Charges (> 4.0 km)", () => {
    test("5.0 km (1 km succeeding): ₱14.75 regular, ₱11.75 discounted", () => {
      // Regular: 13.00 + 1.80 = 14.80 -> rounded to 14.75
      // Discounted: 10.40 + 1.44 = 11.84 -> rounded to 11.75
      const res = calculateTraditionalFare(5.0, "Regular");
      expect(res.regularFare).toBe(14.75);
      expect(res.discountedFare).toBe(11.75);
    });

    test("6.0 km (2 km succeeding): ₱16.50 regular, ₱13.25 discounted", () => {
      // Regular: 13.00 + 3.60 = 16.60 -> rounded to 16.50
      // Discounted: 10.40 + 2.88 = 13.28 -> rounded to 13.25
      const res = calculateTraditionalFare(6.0, "Regular");
      expect(res.regularFare).toBe(16.50);
      expect(res.discountedFare).toBe(13.25);
    });

    test("7.0 km (3 km succeeding): ₱18.50 regular, ₱14.75 discounted", () => {
      // Regular: 13.00 + 5.40 = 18.40 -> rounded to 18.50
      // Discounted: 10.40 + 4.32 = 14.72 -> rounded to 14.75
      const res = calculateTraditionalFare(7.0, "Regular");
      expect(res.regularFare).toBe(18.50);
      expect(res.discountedFare).toBe(14.75);
    });

    test("8.0 km (4 km succeeding): ₱20.25 regular, ₱16.25 discounted", () => {
      // Regular: 13.00 + 7.20 = 20.20 -> rounded to 20.25
      // Discounted: 10.40 + 5.76 = 16.16 -> rounded to 16.25
      const res = calculateTraditionalFare(8.0, "Regular");
      expect(res.regularFare).toBe(20.25);
      expect(res.discountedFare).toBe(16.25);
    });
  });

  describe("Rounding to nearest ₱0.25", () => {
    test("Verifies rounding rules for various numbers", () => {
      expect(roundToNearestQuarter(14.80)).toBe(14.75);
      expect(roundToNearestQuarter(16.60)).toBe(16.50);
      expect(roundToNearestQuarter(18.40)).toBe(18.50);
      expect(roundToNearestQuarter(20.20)).toBe(20.25);
      expect(roundToNearestQuarter(13.00)).toBe(13.00);
      expect(roundToNearestQuarter(13.12)).toBe(13.00);
      expect(roundToNearestQuarter(13.13)).toBe(13.25);
    });
  });

  describe("Discounted Categories", () => {
    test("Student, Senior, PWD all receive discounted rate", () => {
      const stu = calculateTraditionalFare(5.0, "Student");
      expect(stu.selectedCategoryFare).toBe(11.75);

      const sen = calculateTraditionalFare(5.0, "Senior citizen");
      expect(sen.selectedCategoryFare).toBe(11.75);

      const pwd = calculateTraditionalFare(5.0, "PWD");
      expect(pwd.selectedCategoryFare).toBe(11.75);
    });
  });

  describe("Exclusion of Non-Traditional Modes & Unverified Data", () => {
    test("Modern jeepneys are rejected from traditional fare service", () => {
      const res = calculateTraditionalFare(5.0, "Regular", "Modern");
      expect(res.isAvailable).toBe(false);
      expect(res.unavailableReason).toBe("Fare unavailable (Traditional jeepneys only)");
    });

    test("Buses and other modes are rejected", () => {
      const res = calculateTraditionalFare(5.0, "Regular", "Bus");
      expect(res.isAvailable).toBe(false);
    });

    test("Zero or invalid distance returns unavailable", () => {
      const res = calculateTraditionalFare(0, "Regular");
      expect(res.isAvailable).toBe(false);
      expect(res.unavailableReason).toBe("Fare unavailable (Unverified distance)");
    });
  });
});
