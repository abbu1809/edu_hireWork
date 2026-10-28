import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../api/admin.api";
import { queryKeys } from "@/shared/constants/queryKeys";

const keys = queryKeys.admin;

export const useAdminStats = () => useQuery({ queryKey: keys.stats, queryFn: adminApi.stats });
export const useAdminTeachers = () => useQuery({ queryKey: keys.teachers, queryFn: adminApi.teachers });
export const useAdminInstitutes = () => useQuery({ queryKey: keys.institutes, queryFn: adminApi.institutes });
export const useAdminVacancies = () => useQuery({ queryKey: keys.vacancies, queryFn: adminApi.vacancies });
export const useAdminPayments = () => useQuery({ queryKey: keys.payments, queryFn: adminApi.payments });
export const useAdminBlog = () => useQuery({ queryKey: keys.blog, queryFn: adminApi.blog });
export const useAdminInquiries = () => useQuery({ queryKey: keys.inquiries, queryFn: adminApi.inquiries });
export const useAdminAuditLogs = () => useQuery({ queryKey: keys.auditLogs, queryFn: adminApi.auditLogs });

/** Mutation that refreshes all admin data plus the public lists it affects. */
const useAdminMutation = (mutationFn, extraKeys = []) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.all });
      extraKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
    },
  });
};

export const useVerifyEntity = () => useAdminMutation(adminApi.verify, [["teachers"], ["public"]]);
export const useFeatureEntity = () => useAdminMutation(adminApi.feature, [["teachers"], ["public"]]);
export const useArchiveEntity = () => useAdminMutation(adminApi.archive, [["teachers"], ["public"]]);
export const useMatchmake = () => useAdminMutation(adminApi.matchmake);
export const useBroadcast = () => useAdminMutation(adminApi.broadcast);
export const useCreatePost = () => useAdminMutation(adminApi.createPost, [["blog"]]);
export const useDeletePost = () => useAdminMutation(adminApi.deletePost, [["blog"]]);
export const useUpdateInquiry = () => useAdminMutation(adminApi.updateInquiry);

// ---- Email center ----
export const useEmailStatus = () => useQuery({ queryKey: ["admin", "email", "status"], queryFn: adminApi.emailStatus, staleTime: 60 * 1000 });

/** Polls every 4s while any campaign is still queued or sending. */
export const useEmailBroadcasts = () =>
  useQuery({
    queryKey: ["admin", "email", "broadcasts"],
    queryFn: adminApi.emailBroadcasts,
    refetchInterval: (query) => ((query.state.data || []).some((b) => b.status === "QUEUED" || b.status === "SENDING") ? 4000 : false),
  });

export const useSubscribers = () =>
  useQuery({
    queryKey: ["admin", "subscribers"],
    queryFn: adminApi.subscribers,
    select: (result) => ({ items: result.data || [], subscribed: result.meta.subscribed || 0 }),
  });

export const useEmailBroadcast = () => useAdminMutation(adminApi.emailBroadcast);
export const useEmailTest = () => useMutation({ mutationFn: adminApi.emailTest });
