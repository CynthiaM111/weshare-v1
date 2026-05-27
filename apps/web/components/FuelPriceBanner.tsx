const TICKER_ITEMS: string[] = [
  "⛽ Petrol price in Rwanda: RWF 1,372/L",
  "🚗 Private taxi Kigali–Musanze: RWF 15,000",
  "✅ WeShare estimated fare: RWF 5,000–7,500",
  "💰 Average monthly savings with WeShare: RWF 80,000+",
  "📱 Download WeShare — ride smarter",
];

const TICKER_TEXT = TICKER_ITEMS.join("     •     ") + "     •     ";

export function FuelPriceBanner() {
  return (
    <div
      aria-label="Live fuel and fare ticker"
      className="ws-fuel-banner"
    >
      <div className="ws-marquee-track">
        <span className="ws-marquee-content">{TICKER_TEXT}</span>
        <span aria-hidden="true" className="ws-marquee-content">
          {TICKER_TEXT}
        </span>
      </div>
    </div>
  );
}

export default FuelPriceBanner;
