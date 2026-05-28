import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { api } from '../../../shared/api';
import type { AllAnnotationsData } from '../../../shared/contracts';

function allAnnotationsQueryOptions() {
    return {
        queryKey: ['all-annotations'] as const,
        queryFn: (): Promise<AllAnnotationsData> => api.getAllAnnotations(),
    };
}

export function useAllAnnotationsQuery() {
    return useQuery({
        ...allAnnotationsQueryOptions(),
        placeholderData: keepPreviousData,
    });
}
