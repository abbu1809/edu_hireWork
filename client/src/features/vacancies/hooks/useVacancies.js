import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { vacanciesApi } from "../api/vacancies.api";
import { queryKeys } from "@/shared/constants/queryKeys";

/** Public job board (active vacancies). */
export const useActiveVacancies = (filters = {}) =>
  useQuery({
    queryKey: queryKeys.vacancies(filters),
    queryFn: () => vacanciesApi.listActive(filters),
    placeholderData: keepPreviousData,
  });

export const useVacancy = (id) =>
  useQuery({
    queryKey: queryKeys.vacancy(id),
    queryFn: () => vacanciesApi.getById(id),
    enabled: Boolean(id),
  });

export const useMyVacancies = () =>
  useQuery({
    queryKey: queryKeys.myVacancies,
    queryFn: vacanciesApi.listMine,
  });

const useInvalidateVacancies = () => {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["vacancies"] });
    queryClient.invalidateQueries({ queryKey: queryKeys.publicStats });
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.all });
  };
};

export const useCreateVacancy = () => {
  const invalidate = useInvalidateVacancies();
  return useMutation({ mutationFn: vacanciesApi.create, onSuccess: invalidate });
};

export const useUpdateVacancy = () => {
  const invalidate = useInvalidateVacancies();
  return useMutation({ mutationFn: ({ id, ...payload }) => vacanciesApi.update(id, payload), onSuccess: invalidate });
};

export const useDeleteVacancy = () => {
  const invalidate = useInvalidateVacancies();
  return useMutation({ mutationFn: vacanciesApi.remove, onSuccess: invalidate });
};
