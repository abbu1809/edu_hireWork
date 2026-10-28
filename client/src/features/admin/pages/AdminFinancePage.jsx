import { DollarSign, CheckCircle, Clock, XCircle, Receipt } from "lucide-react";
import { useAdminPayments } from "../hooks/useAdmin";
import { DashboardHeader, KpiCard } from "@/shared/components/layout/DashboardLayout";
import EmptyState from "@/shared/components/EmptyState";
import QueryState from "@/shared/components/QueryState";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { formatCurrency, formatDateTime } from "@/shared/utils/format";

const STATUS_BADGE = { CAPTURED: "badge-verified", CREATED: "badge-pending", FAILED: "badge-rejected", REFUNDED: "badge-gold" };

export default function AdminFinancePage() {
  useDocumentTitle("Finance & Revenue");
  const query = useAdminPayments();
  const payments = query.data || [];
  const captured = payments.filter((p) => p.status === "CAPTURED");
  const revenue = captured.reduce((sum, p) => sum + Number(p.amount || 0), 0);

  return (
    <div>
      <DashboardHeader title="Financials & Razorpay Unlocks" subtitle="Transaction records for educator profile unlocks and subscriptions" />

      <div className="kpi-grid">
        <KpiCard icon={DollarSign} label="Total Volume" value={formatCurrency(revenue)} />
        <KpiCard icon={CheckCircle} label="Captured Payments" value={captured.length} />
        <KpiCard icon={Clock} label="Pending Orders" value={payments.filter((p) => p.status === "CREATED").length} />
        <KpiCard icon={XCircle} label="Failed" value={payments.filter((p) => p.status === "FAILED").length} />
      </div>

      <QueryState query={query} loadingLabel="Loading transactions...">
        {payments.length === 0 ? (
          <EmptyState icon={Receipt} title="No Transactions Yet">
            Razorpay payments for contact unlocks will be recorded here as soon as institutes start paying.
          </EmptyState>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Payer</th>
                  <th>Purpose</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Status</th>
                  <th>Payment ID</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td style={{ whiteSpace: "nowrap" }}>{formatDateTime(p.created_at)}</td>
                    <td>
                      <strong>{p.payer_name}</strong>
                    </td>
                    <td>{p.purpose}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{formatCurrency(p.amount)}</td>
                    <td>{p.method || "—"}</td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[p.status] || "badge-role"}`}>{p.status}</span>
                    </td>
                    <td style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>{p.payment_id || p.order_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </QueryState>
    </div>
  );
}
