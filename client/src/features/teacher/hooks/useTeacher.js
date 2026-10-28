import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import { teacherApi } from "../api/teacher.api";
import { queryKeys } from "@/shared/constants/queryKeys";
import { setUser } from "@/features/auth/store/authSlice";

export const useMyApplications = ({ enabled = true } = {}) =>
  useQuery({ queryKey: queryKeys.myApplications, queryFn: teacherApi.myApplications, enabled });

export const useMyInterviews = (enabled = true) =>
  useQuery({ queryKey: queryKeys.myInterviews, queryFn: teacherApi.myInterviews, enabled });

export const useMyDocuments = () => useQuery({ queryKey: queryKeys.myDocuments, queryFn: teacherApi.myDocuments });

export const useTeacherPreferences = () =>
  useQuery({ queryKey: queryKeys.teacherPreferences, queryFn: teacherApi.getPreferences });

export const useApplyToVacancy = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: teacherApi.apply,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.myApplications }),
  });
};

export const useWithdrawApplication = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: teacherApi.withdraw,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.myApplications }),
  });
};

/** Saves the profile; the API answers with the refreshed user, which replaces the session user. */
export const useUpdateTeacherProfile = () => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: teacherApi.updateProfile,
    onSuccess: (user) => {
      if (user) dispatch(setUser(user));
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
    },
  });
};

export const useUpdateTeacherPreferences = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: teacherApi.updatePreferences,
    onSuccess: (prefs) => queryClient.setQueryData(queryKeys.teacherPreferences, prefs),
  });
};

export const useUploadDocument = () => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: teacherApi.uploadDocument,
    onSuccess: (result) => {
      if (result?.user) dispatch(setUser(result.user));
      queryClient.invalidateQueries({ queryKey: queryKeys.myDocuments });
    },
  });
};

export const useDeleteDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: teacherApi.deleteDocument,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.myDocuments }),
  });
};
