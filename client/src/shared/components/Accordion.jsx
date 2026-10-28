import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";

/** Accessible FAQ accordion (DESIGN.md expander: 300ms measured ease-out). */
export default function Accordion({ items, defaultOpen = null }) {
  const [open, setOpen] = useState(defaultOpen);
  const baseId = useId();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {items.map((item, index) => {
        const isOpen = open === index;
        const triggerId = `${baseId}-t${index}`;
        const panelId = `${baseId}-p${index}`;
        return (
          <div key={item.q} className="accordion-item">
            <h3 style={{ fontSize: "inherit", margin: 0 }}>
              <button
                id={triggerId}
                type="button"
                className="accordion-trigger"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen(isOpen ? null : index)}
              >
                <span>{item.q}</span>
                <ChevronDown size={20} aria-hidden="true" />
              </button>
            </h3>
            <div id={panelId} role="region" aria-labelledby={triggerId} className="accordion-panel" data-open={isOpen}>
              <div>
                <p>{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
