import { useMemo, useState } from 'react';
import { LuHighlighter, LuBookmark, LuNotebookPen } from 'react-icons/lu';

import { useDocumentTitle } from '../../../shared/hooks/useDocumentTitle';
import { useSiteQuery } from '../../../shared/hooks/useSiteQuery';
import { translation } from '../../../shared/i18n';
import { useQueryTransitionState } from '../../../shared/lib/state/useQueryTransitionState';
import { QueryStateLayout } from '../../../shared/ui/feedback/QueryStateLayout';
import { PageContent } from '../../../shared/ui/layout/PageContent';
import { PageHeader } from '../../../shared/ui/layout/PageHeader';
import {
    SearchableMultiSelect,
    type SelectOption,
} from '../../../shared/ui/selectors/SearchableMultiSelect';
import { useAllAnnotationsQuery } from '../hooks/useAllAnnotationsQuery';
import { NotesAnnotationCard } from '../components/NotesAnnotationCard';
import type { AllAnnotationsEntry } from '../../../shared/contracts';

type FilterMode = 'all' | 'highlights' | 'notes' | 'bookmarks';

function classifyAnnotation(
    a: AllAnnotationsEntry,
): 'highlight' | 'note' | 'bookmark' {
    if (a.drawer == null) return 'bookmark';
    if (a.note != null) return 'note';
    return 'highlight';
}

function matchesFilter(a: AllAnnotationsEntry, filter: FilterMode): boolean {
    if (filter === 'all') return true;
    const kind = classifyAnnotation(a);
    if (filter === 'highlights') return kind === 'highlight' || kind === 'note';
    if (filter === 'notes') return kind === 'note';
    return kind === 'bookmark';
}

const FILTER_OPTIONS: {
    value: FilterMode;
    labelKey: string;
    icon: typeof LuHighlighter;
}[] = [
    { value: 'all', labelKey: 'filter.all', icon: LuHighlighter },
    { value: 'highlights', labelKey: 'highlights', icon: LuHighlighter },
    { value: 'notes', labelKey: 'notes-label', icon: LuNotebookPen },
    { value: 'bookmarks', labelKey: 'bookmarks', icon: LuBookmark },
];

export function NotesRoute() {
    const { siteQuery } = useSiteQuery();
    const annotationsQuery = useAllAnnotationsQuery();
    const transition = useQueryTransitionState({
        data: annotationsQuery.data,
        isLoading: annotationsQuery.isLoading,
        isFetching: annotationsQuery.isFetching,
        isPlaceholderData: annotationsQuery.isPlaceholderData,
    });

    const [filter, setFilter] = useState<FilterMode>('all');
    const [selectedBooks, setSelectedBooks] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');

    useDocumentTitle(
        translation.get('all-notes'),
        siteQuery.data?.title,
    );

    const bookOptions = useMemo<SelectOption[]>(() => {
        const annotations = transition.displayData?.annotations;
        if (!annotations) return [];

        const seen = new Map<string, string>();
        for (const a of annotations) {
            if (!seen.has(a.item_id)) {
                seen.set(a.item_id, a.item_title);
            }
        }

        return [...seen.entries()]
            .sort((a, b) => a[1].localeCompare(b[1]))
            .map(([id, title]) => ({ value: id, label: title }));
    }, [transition.displayData]);

    const filtered = useMemo(() => {
        const annotations = transition.displayData?.annotations;
        if (!annotations) return [];

        let result = annotations.filter((a) => matchesFilter(a, filter));

        if (selectedBooks.size > 0) {
            result = result.filter((a) => selectedBooks.has(a.item_id));
        }

        if (searchTerm.trim()) {
            const lower = searchTerm.toLowerCase();
            result = result.filter(
                (a) =>
                    a.text?.toLowerCase().includes(lower) ||
                    a.note?.toLowerCase().includes(lower) ||
                    a.item_title.toLowerCase().includes(lower) ||
                    a.item_authors.some((author) =>
                        author.toLowerCase().includes(lower),
                    ) ||
                    a.chapter?.toLowerCase().includes(lower),
            );
        }

        return result;
    }, [transition.displayData, filter, selectedBooks, searchTerm]);

    const counts = useMemo(() => {
        const annotations = transition.displayData?.annotations ?? [];
        let highlights = 0;
        let notes = 0;
        let bookmarks = 0;
        for (const a of annotations) {
            const kind = classifyAnnotation(a);
            if (kind === 'highlight') highlights++;
            else if (kind === 'note') notes++;
            else bookmarks++;
        }
        return { all: annotations.length, highlights: highlights + notes, notes, bookmarks };
    }, [transition.displayData]);

    return (
        <>
            <PageHeader title={translation.get('all-notes')} />

            <PageContent className="space-y-5">
                <QueryStateLayout
                    isError={annotationsQuery.isError}
                    error={annotationsQuery.error}
                    onRetry={() => annotationsQuery.refetch()}
                    showBlockingSpinner={transition.showBlockingSpinner}
                    showOverlaySpinner={transition.showOverlaySpinner}
                    hasData={Boolean(transition.displayData)}
                    srLabel="Loading annotations"
                    renderContent={() => (
                        <>
                            {/* Filter bar */}
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="flex items-center gap-1.5 bg-gray-100/80 dark:bg-dark-800/80 rounded-lg p-1 flex-shrink-0">
                                    {FILTER_OPTIONS.map((opt) => {
                                        const active = filter === opt.value;
                                        const Icon = opt.icon;
                                        const count =
                                            counts[
                                                opt.value as keyof typeof counts
                                            ];
                                        return (
                                            <button
                                                key={opt.value}
                                                onClick={() =>
                                                    setFilter(opt.value)
                                                }
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                                                    active
                                                        ? 'bg-white dark:bg-dark-700 text-gray-900 dark:text-white shadow-xs'
                                                        : 'text-gray-500 dark:text-dark-400 hover:text-gray-700 dark:hover:text-dark-200'
                                                }`}
                                            >
                                                <Icon
                                                    className="w-3.5 h-3.5"
                                                    aria-hidden="true"
                                                />
                                                <span className="hidden sm:inline">
                                                    {translation.get(
                                                        opt.labelKey,
                                                        count,
                                                    )}
                                                </span>
                                                <span className="text-xs opacity-60">
                                                    {count}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>

                                <SearchableMultiSelect
                                    options={bookOptions}
                                    selected={selectedBooks}
                                    onChange={setSelectedBooks}
                                    allLabel={translation.get('notes-book-filter')}
                                    ariaLabel={translation.get('notes-book-filter')}
                                    searchPlaceholder={translation.get('notes-book-search-placeholder')}
                                    triggerClassName="sm:max-w-48 md:max-w-64"
                                />

                                <div className="flex-1">
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) =>
                                            setSearchTerm(e.target.value)
                                        }
                                        placeholder={translation.get(
                                            'notes-search-placeholder',
                                        )}
                                        className="w-full rounded-lg border border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-850 text-gray-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 placeholder:text-gray-400 dark:placeholder:text-dark-500"
                                    />
                                </div>
                            </div>

                            {/* Results */}
                            {filtered.length === 0 ? (
                                <div className="text-center py-16 text-gray-400 dark:text-dark-500">
                                    <LuNotebookPen className="w-12 h-12 mx-auto mb-4 opacity-40" />
                                    <p className="text-lg font-medium">
                                        {translation.get('notes-empty')}
                                    </p>
                                    <p className="text-sm mt-1">
                                        {translation.get('notes-empty-hint')}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {filtered.map((annotation) => (
                                        <NotesAnnotationCard
                                            key={annotation.id}
                                            annotation={annotation}
                                            hasFiles={siteQuery.data?.capabilities.has_files}
                                        />
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                />
            </PageContent>
        </>
    );
}
