import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { api } from '../../../shared/api';
import type { CollectionsData } from '../../../shared/contracts';

function collectionsQueryOptions() {
    return {
        queryKey: ['collections'] as const,
        queryFn: (): Promise<CollectionsData> => api.getCollections(),
    };
}

export function useCollectionsQuery() {
    return useQuery({
        ...collectionsQueryOptions(),
        placeholderData: keepPreviousData,
    });
}
