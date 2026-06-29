import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getOrCreateGrades,
  saveCourses,
  saveGradesDocument,
  updateCourse,
  upsertPeriodAssignments,
} from '@/api/entities/toolsGrades';
import { queryKeys } from '@/api/query-keys';
import { emptyGradesDocument } from '@/lib/tools/grade-periods';

export function useToolsGrades() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.tools.grades,
    queryFn: getOrCreateGrades,
    enabled: true,
    placeholderData: emptyGradesDocument,
    retry: false,
    staleTime: 30_000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.tools.grades });

  const saveDocMutation = useMutation({
    mutationFn: (patch) => {
      const cached = queryClient.getQueryData(queryKeys.tools.grades) ?? emptyGradesDocument();
      return saveGradesDocument({ ...cached, ...patch });
    },
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tools.grades });
      const prev = queryClient.getQueryData(queryKeys.tools.grades);
      queryClient.setQueryData(queryKeys.tools.grades, {
        ...(prev ?? emptyGradesDocument()),
        ...patch,
      });
      return { prev };
    },
    onError: (_err, _patch, ctx) => {
      if (ctx?.prev !== undefined) {
        queryClient.setQueryData(queryKeys.tools.grades, ctx.prev);
      }
    },
    onSuccess: (data, patch) => {
      queryClient.setQueryData(queryKeys.tools.grades, (current) => ({
        ...(current ?? emptyGradesDocument()),
        ...data,
        ...patch,
        periodSystem: patch?.periodSystem ?? data?.periodSystem ?? current?.periodSystem,
      }));
    },
  });

  const saveCoursesMutation = useMutation({
    mutationFn: (courses) => {
      const cached = queryClient.getQueryData(queryKeys.tools.grades);
      return saveCourses(courses, cached);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.tools.grades, data);
    },
  });

  const upsertPeriodMutation = useMutation({
    mutationFn: ({ courseId, periodId, assignments }) => {
      const cached = queryClient.getQueryData(queryKeys.tools.grades);
      return upsertPeriodAssignments(courseId, periodId, assignments, cached);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.tools.grades, data);
    },
  });

  const updateCourseMutation = useMutation({
    mutationFn: ({ courseId, patch }) => {
      const cached = queryClient.getQueryData(queryKeys.tools.grades);
      return updateCourse(courseId, patch, cached);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.tools.grades, data);
    },
  });

  const data = query.data ?? emptyGradesDocument();

  return {
    data,
    courses: data.courses || [],
    periodSystem: data.periodSystem || 'quarter',
    isLoading: query.isLoading,
    saveDocument: saveDocMutation.mutateAsync,
    saveCourses: saveCoursesMutation.mutateAsync,
    upsertPeriodAssignments: upsertPeriodMutation.mutateAsync,
    updateCourse: updateCourseMutation.mutateAsync,
    invalidate,
  };
}
