function calculateNights(checkInDate, checkOutDate) {
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);
  const difference = checkOut - checkIn;
  const nights = Math.ceil(difference / (1000 * 60 * 60 * 24));
  return nights > 0 ? nights : 0;
}

function calculateTotalPrice(pricePerNight, nights) {
  return pricePerNight * nights;
}

function validateGuestCapacity(guestCount, roomCapacity) {
  return guestCount <= roomCapacity;
}

describe("Booking Business Logic & Math Unit Tests", () => {
  test("1. Calculate 1-night stay correctly", () => {
    const nights = calculateNights("2026-09-01", "2026-09-02");
    expect(nights).toBe(1);
  });

  test("2. Calculate multi-night stay correctly (4 nights)", () => {
    const nights = calculateNights("2026-09-01", "2026-09-05");
    expect(nights).toBe(4);
  });

  test("3. Reject check-out date before or equal to check-in date", () => {
    const zeroNights = calculateNights("2026-09-05", "2026-09-05");
    const negativeNights = calculateNights("2026-09-05", "2026-09-02");

    expect(zeroNights).toBe(0);
    expect(negativeNights).toBe(0);
  });

  test("4. Calculate total price strictly by nights (not guest count)", () => {
    const pricePerNight = 150;
    const nights = 3;
    const totalPrice = calculateTotalPrice(pricePerNight, nights);

    expect(totalPrice).toBe(450);
  });

  test("5. Validate guest capacity limits correctly", () => {
    expect(validateGuestCapacity(2, 2)).toBe(true);
    expect(validateGuestCapacity(4, 2)).toBe(false);
    expect(validateGuestCapacity(1, 4)).toBe(true);
  });
});
