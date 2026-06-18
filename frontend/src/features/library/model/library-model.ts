import type { LibraryListItem } from '../api/library-data';

export type LibraryCollection = 'books' | 'comics';

export const LIBRARY_SECTION_KEYS = [
    'reading',
    'abandoned',
    'completed',
    'unread',
] as const;

export type LibrarySectionKey = (typeof LIBRARY_SECTION_KEYS)[number];

type LibrarySectionVisibilityState = Record<LibrarySectionKey, boolean>;

type LibrarySectionBuckets = Record<LibrarySectionKey, LibraryListItem[]>;

export const LIBRARY_FILTER_VALUES = [
    'all',
    'reading',
    'completed',
    'abandoned',
    'unread',
] as const;

export type LibraryFilterValue = (typeof LIBRARY_FILTER_VALUES)[number];

export const LIBRARY_SORT_VALUES = ['last-opened', 'alphabetical'] as const;

export type LibrarySortOrder = (typeof LIBRARY_SORT_VALUES)[number];

const DEFAULT_SECTION_STATE: LibrarySectionVisibilityState = {
    reading: true,
    abandoned: false,
    completed: true,
    unread: true,
};

const LIBRARY_STATUS_FILTERS = new Set<LibraryFilterValue>(
    LIBRARY_FILTER_VALUES,
);

export function defaultLibrarySectionState(): LibrarySectionVisibilityState {
    return { ...DEFAULT_SECTION_STATE };
}

export function libraryTitleTranslationKey(
    collection: LibraryCollection,
): 'books' | 'comics' {
    return collection;
}

export function normalizeSearchTerm(value: string): string {
    return value.trim().toLowerCase();
}

export function normalizeLibraryFilterValue(
    value: string | null | undefined,
    hasUnreadItems: boolean,
): LibraryFilterValue {
    if (!value || !LIBRARY_STATUS_FILTERS.has(value as LibraryFilterValue)) {
        return 'all';
    }

    if (value === 'unread' && !hasUnreadItems) {
        return 'all';
    }

    return value as LibraryFilterValue;
}

export function sectionFromLibraryItem(item: LibraryListItem): LibrarySectionKey {
    if (item.status === 'reading') {
        return 'reading';
    }

    if (item.status === 'complete') {
        return 'completed';
    }

    if (item.status === 'abandoned') {
        return 'abandoned';
    }

    return 'unread';
}

export function normalizeLibrarySortOrder(
    value: string | null | undefined,
): LibrarySortOrder {
    if (
        value &&
        (LIBRARY_SORT_VALUES as readonly string[]).includes(value)
    ) {
        return value as LibrarySortOrder;
    }
    return 'last-opened';
}

function compareAlphabetical(
    left: LibraryListItem,
    right: LibraryListItem,
): number {
    return left.title.localeCompare(right.title) || left.id.localeCompare(right.id);
}

function compareLastOpened(
    left: LibraryListItem,
    right: LibraryListItem,
): number {
    const leftDate = left.last_open_at ?? '';
    const rightDate = right.last_open_at ?? '';
    if (leftDate !== rightDate) {
        return rightDate.localeCompare(leftDate);
    }
    return compareAlphabetical(left, right);
}

export function bucketLibraryItems(
    items: LibraryListItem[],
    sortOrder: LibrarySortOrder = 'last-opened',
): LibrarySectionBuckets {
    const buckets: LibrarySectionBuckets = {
        reading: [],
        abandoned: [],
        completed: [],
        unread: [],
    };

    items.forEach((item) => {
        buckets[sectionFromLibraryItem(item)].push(item);
    });

    const compareFn =
        sortOrder === 'alphabetical' ? compareAlphabetical : compareLastOpened;

    LIBRARY_SECTION_KEYS.forEach((sectionKey) => {
        buckets[sectionKey].sort(compareFn);
    });

    return buckets;
}

export function itemMatchesSearch(
    item: LibraryListItem,
    normalizedSearchTerm: string,
): boolean {
    if (!normalizedSearchTerm) {
        return true;
    }

    const title = item.title.toLowerCase();
    const authors = item.authors.join(', ').toLowerCase();
    const seriesName = (item.series?.name ?? '').toLowerCase();
    const seriesIndex = (item.series?.index ?? '').toLowerCase();

    return (
        title.includes(normalizedSearchTerm) ||
        authors.includes(normalizedSearchTerm) ||
        seriesName.includes(normalizedSearchTerm) ||
        seriesIndex.includes(normalizedSearchTerm)
    );
}

export function sectionMatchesFilter(
    sectionKey: LibrarySectionKey,
    filterValue: LibraryFilterValue,
): boolean {
    return filterValue === 'all' || filterValue === sectionKey;
}
