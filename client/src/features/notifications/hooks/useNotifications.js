import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "../api/notifications.api";
import { queryKeys } from "@/shared/constants/queryKeys";
import { useAuth } from "@/features/auth/hooks/useAuth";

/** Signed-in user's notifications; polls every minute so the bell stays current. */
export const useNotifications = () => {
  const { currentUser } = useAuth();
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: notificationsApi.list,
    enabled: Boolean(currentUser),
    refetchInterval: 60 * 1000,
    select: (result) => ({ items: result.data || [], unread: result.meta.unread || 0 }),
  });
};

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications }),
  });
};

export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications }),
  });
};
