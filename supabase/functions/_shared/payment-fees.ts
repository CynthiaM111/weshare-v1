/** WeShare platform fee — added on top of the driver's posted ride price. */
export const WESHARE_FEE_RATE = 0.05;

export function computePaymentAmounts(rideFareRwf: number): {
  netAmount: number;
  serviceFee: number;
  grossAmount: number;
} {
  const netAmount = Math.round(rideFareRwf);
  const serviceFee = Math.round(netAmount * WESHARE_FEE_RATE);
  const grossAmount = netAmount + serviceFee;
  return { netAmount, serviceFee, grossAmount };
}
