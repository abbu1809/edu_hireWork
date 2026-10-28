import { Check, Hourglass } from "lucide-react";

const CLASSES = {
  Verified: "badge-verified",
  Rejected: "badge-rejected",
  Suspended: "badge-rejected",
  "Under Review": "badge-gold",
};

export default function VerificationBadge({ status, verified }) {
  const value = verified ? "Verified" : status || "Pending";
  return (
    <span className={`badge ${CLASSES[value] || "badge-pending"}`}>
      {value === "Verified" && <Check size={13} aria-hidden="true" />}
      {value === "Pending" && <Hourglass size={13} aria-hidden="true" />}
      {value}
    </span>
  );
}
