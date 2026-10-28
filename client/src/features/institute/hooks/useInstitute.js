import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import { instituteApi } from "../api/institute.api";
import { queryKeys } from "@/shared/constants/queryKeys";
import { setUser } from "@/features/auth/store/authSlice";

export const useTalentPool = (filters = {}) =>
  useQuery({
    queryKey: queryKeys.talent(filters),
    queryFn: () => instituteApi.talent(filters),
    placeholderData: keepPreviousData,
    select: (result) => ({ teachers: result.data || [], unlockedIds: result.meta.unlockedIds || [] }),
  });

export const useUnlockedTeachers = () => useQuery({ queryKey: queryKeys.unlocked, queryFn: instituteApi.unlocked });

export const useReceivedApplications = () =>
  useQuery({ queryKey: queryKeys.receivedApplications, queryFn: instituteApi.receivedApplications });

export const useUpdateApplicationStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: instituteApi.updateApplicationStatus,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.receivedApplications }),
  });
};

export const useScheduleInterview = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: instituteApi.scheduleInterview,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.receivedApplications });
      queryClient.invalidateQueries({ queryKey: queryKeys.myInterviews });
    },
  });
};

export const useUpdateInstituteProfile = () => {
  const dispatch = useDispatch();
  return useMutation({
    mutationFn: instituteApi.updateProfile,
    onSuccess: (user) => user && dispatch(setUser(user)),
  });
};
