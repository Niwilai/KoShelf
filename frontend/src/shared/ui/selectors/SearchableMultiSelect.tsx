import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import { LuCheck, LuChevronDown, LuSearch, LuX } from 'react-icons/lu';

import {
    DROPDOWN_PANEL_BASE_CLASSNAME,
    DROPDOWN_TRIGGER_BASE_CLASSNAME,
} from '../dropdown/dropdown-styles';
import { DropdownPortal } from '../dropdown/DropdownPortal';

export type SelectOption = {
    value: string;
    label: string;
};

type SearchableMultiSelectProps = {
    options: readonly SelectOption[];
    selected: ReadonlySet<string>;
    onChange: (selected: Set<string>) => void;
    allLabel: ReactNode;
    ariaLabel: string;
    searchPlaceholder?: string;
    triggerClassName?: string;
};

export function SearchableMultiSelect({
    options,
    selected,
    onChange,
    allLabel,
    ariaLabel,
    searchPlaceholder,
    triggerClassName,
}: SearchableMultiSelectProps) {
    const triggerRef = useRef<HTMLButtonElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');

    const isAllSelected = selected.size === 0;

    useEffect(() => {
        if (open) {
            setSearch('');
            requestAnimationFrame(() => searchRef.current?.focus());
        }
    }, [open]);

    const filteredOptions = useMemo(() => {
        if (!search.trim()) return options;
        const lower = search.toLowerCase();
        return options.filter((o) => o.label.toLowerCase().includes(lower));
    }, [options, search]);

    const toggleValue = useCallback(
        (value: string) => {
            const next = new Set(selected);
            if (next.has(value)) {
                next.delete(value);
            } else {
                next.add(value);
            }
            onChange(next);
        },
        [selected, onChange],
    );

    const selectAll = useCallback(() => {
        onChange(new Set());
    }, [onChange]);

    const triggerLabel = useMemo(() => {
        if (isAllSelected) return allLabel;
        if (selected.size === 1) {
            const id = [...selected][0];
            return options.find((o) => o.value === id)?.label ?? allLabel;
        }
        return `${selected.size} selected`;
    }, [isAllSelected, selected, options, allLabel]);

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                aria-label={ariaLabel}
                title={ariaLabel}
                onClick={() => setOpen((c) => !c)}
                className={`${DROPDOWN_TRIGGER_BASE_CLASSNAME} text-gray-900 dark:text-white sm:gap-2 sm:justify-start w-10 sm:w-auto sm:px-4 sm:pl-3 ${triggerClassName ?? ''}`}
            >
                <LuSearch
                    className={`sm:hidden w-5 h-5 shrink-0 ${isAllSelected ? 'text-gray-600 dark:text-gray-300' : 'text-primary-500'}`}
                    aria-hidden="true"
                />
                <span className="hidden sm:inline font-medium truncate min-w-0">
                    {triggerLabel}
                </span>
                {!isAllSelected && (
                    <button
                        type="button"
                        className="hidden sm:flex items-center justify-center w-4 h-4 rounded-full bg-gray-300/60 dark:bg-dark-600/60 hover:bg-gray-400/60 dark:hover:bg-dark-500/60 shrink-0"
                        aria-label="Clear selection"
                        onClick={(e) => {
                            e.stopPropagation();
                            selectAll();
                        }}
                    >
                        <LuX className="w-3 h-3" aria-hidden="true" />
                    </button>
                )}
                <LuChevronDown
                    className="hidden sm:block w-4 h-4 text-primary-400 shrink-0"
                    aria-hidden="true"
                />
            </button>

            <DropdownPortal
                triggerRef={triggerRef}
                open={open}
                onClose={() => setOpen(false)}
                className={`${DROPDOWN_PANEL_BASE_CLASSNAME} w-72 sm:w-80`}
            >
                <div className="p-2 border-b border-gray-200/50 dark:border-dark-700/50">
                    <div className="relative">
                        <LuSearch
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-dark-500"
                            aria-hidden="true"
                        />
                        <input
                            ref={searchRef}
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={searchPlaceholder}
                            className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-gray-200/50 dark:border-dark-700/50 bg-gray-50/50 dark:bg-dark-800/50 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-dark-500 focus:outline-none focus:ring-1 focus:ring-primary-500/50"
                        />
                    </div>
                </div>

                <div className="max-h-64 overflow-y-auto py-1">
                    {!search.trim() && (
                        <button
                            type="button"
                            onClick={selectAll}
                            className={`flex items-center gap-2.5 w-full text-left px-3 py-2 text-sm cursor-pointer hover:bg-gray-100/50 dark:hover:bg-dark-700/50 transition-colors border-b border-gray-200/30 dark:border-dark-700/30 ${
                                isAllSelected
                                    ? 'text-primary-700 dark:text-primary-300 font-medium'
                                    : 'text-gray-700 dark:text-dark-200'
                            }`}
                        >
                            <span
                                className={`flex items-center justify-center w-4 h-4 rounded border shrink-0 ${
                                    isAllSelected
                                        ? 'bg-primary-500 border-primary-500'
                                        : 'border-gray-300 dark:border-dark-600'
                                }`}
                            >
                                {isAllSelected && (
                                    <LuCheck
                                        className="w-3 h-3 text-white"
                                        aria-hidden="true"
                                    />
                                )}
                            </span>
                            {allLabel}
                        </button>
                    )}

                    {filteredOptions.length === 0 ? (
                        <div className="px-3 py-4 text-sm text-center text-gray-400 dark:text-dark-500">
                            No matches
                        </div>
                    ) : (
                        filteredOptions.map((option) => {
                            const checked = selected.has(option.value);
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => toggleValue(option.value)}
                                    className={`flex items-center gap-2.5 w-full text-left px-3 py-2 text-sm cursor-pointer hover:bg-gray-100/50 dark:hover:bg-dark-700/50 transition-colors ${
                                        checked
                                            ? 'text-primary-700 dark:text-primary-300 font-medium'
                                            : 'text-gray-700 dark:text-dark-200'
                                    }`}
                                >
                                    <span
                                        className={`flex items-center justify-center w-4 h-4 rounded border shrink-0 ${
                                            checked
                                                ? 'bg-primary-500 border-primary-500'
                                                : 'border-gray-300 dark:border-dark-600'
                                        }`}
                                    >
                                        {checked && (
                                            <LuCheck
                                                className="w-3 h-3 text-white"
                                                aria-hidden="true"
                                            />
                                        )}
                                    </span>
                                    <span className="truncate">
                                        {option.label}
                                    </span>
                                </button>
                            );
                        })
                    )}
                </div>
            </DropdownPortal>
        </>
    );
}
