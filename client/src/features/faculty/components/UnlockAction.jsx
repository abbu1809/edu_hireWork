import { Link } from "react-router";
import { useDispatch } from "react-redux";
import { Unlock, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { openCheckout } from "@/features/payments/store/paymentSlice";
import { usePaymentConfig } from "@/features/payments/hooks/usePaymentConfig";
import { formatCurrency } from "@/shared/utils/format";
import { useThrottledCallback } from "@/shared/hooks/useThrottledCallback";

/** "Unlock contact" for institutes; sign-up prompt for guests; hidden for other roles. */
export default function UnlockAction({ teacher, isUnlocked = false, label }) {
  const { currentUser, role } = useAuth();
  const dispatch = useDispatch();
  const { data: config } = usePaymentConfig();
  const openUnlock = useThrottledCallback(() => dispatch(openCheckout({ teacherId: teacher.id, teacherName: teacher.name })));

  if (!currentUser) {
    return (
      <Link to="/auth?mode=signup&role=institute" className="btn btn-outline" style={{ width: "100%" }}>
        View Profile & Unlock
      </Link>
    );
  }
  if (role !== "institute") return null;
  if (isUnlocked) {
    return (
      <Link to="/institute/unlocked" className="btn btn-outline" style={{ width: "100%" }}>
        <CheckCircle2 size={16} aria-hidden="true" /> Unlocked — View Contact
      </Link>
    );
  }

  return (
    <button
      className="btn btn-primary"
      style={{ width: "100%" }}
      onClick={openUnlock}
    >
      <Unlock size={16} /> {label || `Unlock Contact${config?.unlockFee ? ` (${formatCurrency(config.unlockFee)})` : ""}`}
    </button>
  );
}
