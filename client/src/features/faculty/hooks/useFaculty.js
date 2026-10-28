import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { facultyApi } from "../api/faculty.api";
import { queryKeys } from "@/shared/constants/queryKeys";

export const usePublicFaculty = (filters = {}) =>
  useQuery({
    queryKey: queryKeys.teachers(filters),
    queryFn: () => facultyApi.list(filters),
    placeholderData: keepPreviousData,
  });

export const useFacultyProfile = (id) =>
  useQuery({
    queryKey: queryKeys.teacher(id),
    queryFn: () => facultyApi.getById(id),
    enabled: Boolean(id),
  });
