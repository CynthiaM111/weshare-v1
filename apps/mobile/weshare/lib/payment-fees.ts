/** WeShare platform fee — added on top of the driver's posted ride price. */
export const WESHARE_FEE_RATE = 0.05;

export type PaymentAmounts = {
  /** Driver's posted price (what they receive). */
  rideFare: number;
  /** WeShare fee (5% of ride fare). */
  serviceFee: number;
  /** Total passenger deposit into escrow. */
  depositAmount: number;
  /** Same as rideFare — paid out to the driver on ride completion. */
  driverReceives: number;
};

export function computePaymentAmounts(rideFareRwf: number): PaymentAmounts {
  const rideFare = Math.round(rideFareRwf);
  const serviceFee = Math.round(rideFare * WESHARE_FEE_RATE);
  const depositAmount = rideFare + serviceFee;
  return {
    rideFare,
    serviceFee,
    depositAmount,
    driverReceives: rideFare,
  };
}
