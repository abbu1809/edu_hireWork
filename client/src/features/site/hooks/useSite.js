import { useMutation, useQuery } from "@tanstack/react-query";
import { siteApi } from "../api/site.api";
import { queryKeys } from "@/shared/constants/queryKeys";

/** Admin-managed key/value settings (contact email, support phone, content toggles...). */
export const usePlatformSettings = () =>
  useQuery({
    queryKey: queryKeys.settings,
    queryFn: siteApi.settings,
    staleTime: 5 * 60 * 1000,
  });

/** Live counters for the landing page. */
export const usePublicStats = () =>
  useQuery({
    queryKey: queryKeys.publicStats,
    queryFn: siteApi.stats,
  });

export const usePublicInstitutes = (filters = {}) =>
  useQuery({
    queryKey: queryKeys.publicInstitutes(filters),
    queryFn: () => siteApi.institutes(filters),
  });

export const useContactInquiry = () => useMutation({ mutationFn: siteApi.contact });

export const useSubscribe = () => useMutation({ mutationFn: siteApi.subscribe });

export const useUnsubscribe = () => useMutation({ mutationFn: siteApi.unsubscribe });
