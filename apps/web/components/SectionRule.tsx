type Props = {
  accent?: "teal" | "accent" | "gold" | "none";
};

/** Route-style divider between page sections — accent dash + dashed line. */
export function SectionRule({ accent = "teal" }: Props) {
  const stripe =
    accent === "accent"
      ? "bg-accent"
      : accent === "gold"
        ? "bg-gold"
        : accent === "none"
          ? "bg-transparent"
          : "bg-teal";

  return (
    <div aria-hidden="true" className="ws-section-rule py-px">
      <div className={`ws-section-rule-stripe ${stripe}`}>
        <div className="ws-section-rule-line" />
      </div>
    </div>
  );
}

export default SectionRule;
