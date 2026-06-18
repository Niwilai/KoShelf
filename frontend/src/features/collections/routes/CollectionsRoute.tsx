import { useMemo } from 'react';
import { LuLibrary } from 'react-icons/lu';

import { useDocumentTitle } from '../../../shared/hooks/useDocumentTitle';
import { useSiteQuery } from '../../../shared/hooks/useSiteQuery';
import { translation } from '../../../shared/i18n';
import { useBookCardTiltEffect } from '../../../shared/lib/dom/useTiltEffect';
import { useSectionVisibilityState } from '../../../shared/lib/state/useSectionVisibilityState';
import { useQueryTransitionState } from '../../../shared/lib/state/useQueryTransitionState';
import { QueryStateLayout } from '../../../shared/ui/feedback/QueryStateLayout';
import { PageContent } from '../../../shared/ui/layout/PageContent';
import { PageHeader } from '../../../shared/ui/layout/PageHeader';
import { CollapsibleSection } from '../../../shared/ui/sections/CollapsibleSection';
import type { LibraryListItem } from '../../../shared/contracts';
import { LibraryCard } from '../../library/components/LibraryCard';
import {
    sectionFromLibraryItem,
    type LibraryCollection,
} from '../../library/model/library-model';
import { useCollectionsQuery } from '../hooks/useCollectionsQuery';

function collectionForItem(item: LibraryListItem): LibraryCollection {
    return item.content_type === 'comic' ? 'comics' : 'books';
}

export function CollectionsRoute() {
    const { siteQuery } = useSiteQuery();
    const collectionsQuery = useCollectionsQuery();
    const transition = useQueryTransitionState({
        data: collectionsQuery.data,
        isLoading: collectionsQuery.isLoading,
        isFetching: collectionsQuery.isFetching,
        isPlaceholderData: collectionsQuery.isPlaceholderData,
    });

    useDocumentTitle(translation.get('collections'), siteQuery.data?.title);

    const collections = transition.displayData?.collections ?? [];

    const sectionKeys = useMemo(
        () => collections.map((collection) => collection.name),
        [collections],
    );
    const defaults = useMemo(
        () =>
            Object.fromEntries(
                sectionKeys.map((key) => [key, true]),
            ) as Record<string, boolean>,
        [sectionKeys],
    );

    const { state: sectionState, toggle } = useSectionVisibilityState<string>({
        routeId: 'collections',
        sectionKeys,
        defaults,
    });

    const cardKey = useMemo(
        () =>
            collections
                .flatMap((collection) =>
                    collection.items.map(
                        (item) => `${collection.name}:${item.id}`,
                    ),
                )
                .join('|'),
        [collections],
    );
    useBookCardTiltEffect(cardKey);

    return (
        <>
            <PageHeader title={translation.get('collections')} />

            <PageContent className="space-y-6 md:space-y-8">
                <QueryStateLayout
                    isError={collectionsQuery.isError}
                    error={collectionsQuery.error}
                    onRetry={() => collectionsQuery.refetch()}
                    showBlockingSpinner={transition.showBlockingSpinner}
                    showOverlaySpinner={transition.showOverlaySpinner}
                    hasData={Boolean(transition.displayData)}
                    srLabel="Loading collections"
                    renderContent={() =>
                        collections.length === 0 ? (
                            <div className="text-center py-16 text-gray-400 dark:text-dark-500">
                                <LuLibrary className="w-12 h-12 mx-auto mb-4 opacity-40" />
                                <p className="text-lg font-medium">
                                    {translation.get('collections-empty')}
                                </p>
                            </div>
                        ) : (
                            <>
                                {collections.map((collection) => {
                                    const visible =
                                        sectionState[collection.name] ?? true;

                                    return (
                                        <CollapsibleSection
                                            key={collection.name}
                                            sectionKey={collection.name}
                                            accentClass="bg-linear-to-b from-primary-400 to-primary-600"
                                            title={collection.name}
                                            titleBadge={
                                                <span className="bg-linear-to-r from-primary-500 to-primary-600 text-white text-sm px-3 py-1 rounded-full shadow-md font-medium">
                                                    {collection.items.length}
                                                </span>
                                            }
                                            visible={visible}
                                            onToggle={() =>
                                                toggle(collection.name)
                                            }
                                        >
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4 md:gap-6 mb-6 md:mb-8">
                                                {collection.items.map((item) => (
                                                    <LibraryCard
                                                        key={item.id}
                                                        item={item}
                                                        collection={collectionForItem(
                                                            item,
                                                        )}
                                                        sectionKey={sectionFromLibraryItem(
                                                            item,
                                                        )}
                                                    />
                                                ))}
                                            </div>
                                        </CollapsibleSection>
                                    );
                                })}
                            </>
                        )
                    }
                />
            </PageContent>
        </>
    );
}
