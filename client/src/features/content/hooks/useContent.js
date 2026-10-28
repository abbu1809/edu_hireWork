import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { contentApi } from "../api/content.api";
import { queryKeys } from "@/shared/constants/queryKeys";

/** Published articles; `type` is a content stream (TEACHER_UPDATE, INSTITUTE_UPDATE, BLOG or ALL). */
export const useBlogPosts = (filters = {}) =>
  useQuery({
    queryKey: queryKeys.blogPosts(filters),
    queryFn: () => contentApi.list(filters),
    placeholderData: keepPreviousData,
  });

export const useBlogPost = (slug) =>
  useQuery({
    queryKey: queryKeys.blogPost(slug),
    queryFn: () => contentApi.getBySlug(slug),
    enabled: Boolean(slug),
  });
