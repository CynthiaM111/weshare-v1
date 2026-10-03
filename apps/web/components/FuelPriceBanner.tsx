const FUEL_FACTS = [
  { label: "Petrol", value: "RWF 1,372/L" },
  { label: "Kigali–Musanze taxi", value: "RWF 15,000" },
  { label: "WeShare estimate", value: "RWF 5,000–7,500" },
  { label: "Avg. monthly savings", value: "RWF 80,000+" },
] as const;

export function FuelPriceBanner() {
  return (
    <div aria-label="Fuel and fare reference" className="ws-fuel-banner">
      <div className="ws-fuel-strip">
        <span className="ws-fuel-item">
          <span className="ws-pulse-dot" aria-hidden="true" />
          <span>Live context</span>
        </span>
        {FUEL_FACTS.map((item, i) => (
          <span key={item.label} className="ws-fuel-item">
            {i > 0 && <span className="ws-fuel-dot" aria-hidden="true" />}
            <span>{item.label}:</span>
            <strong>{item.value}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}

export default FuelPriceBanner;
