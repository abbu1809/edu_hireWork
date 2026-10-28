import { useQuery } from "@tanstack/react-query";
import { paymentsApi } from "../api/payments.api";
import { queryKeys } from "@/shared/constants/queryKeys";

/** Whether online payments are enabled and the current unlock fee (set on the server). */
export const usePaymentConfig = () =>
  useQuery({
    queryKey: queryKeys.paymentConfig,
    queryFn: paymentsApi.config,
    staleTime: 10 * 60 * 1000,
  });
