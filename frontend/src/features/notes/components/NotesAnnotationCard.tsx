import { Link } from 'react-router';
import {
    LuBookOpen,
    LuClock3,
    LuFileText,
    LuHash,
    LuNotebookPen,
} from 'react-icons/lu';

import { translation } from '../../../shared/i18n';
import type { AllAnnotationsEntry } from '../../../shared/contracts';
import { formatAnnotationDatetime } from '../../library/lib/library-detail-formatters';
import {
    colorQuoteBarGradient,
    DRAWER_ICONS,
    highlightTextClass,
} from '../../library/lib/highlight-constants';
import { buildRoutePath } from '../../../app/routes/route-registry';
import { createDetailReturnState } from '../../../shared/lib/navigation/detail-return-state';
import { isReaderFormatSupported } from '../../reader/lib/reader-format-support';
import { annotationReaderHref } from '../../library/lib/library-reader-links';

type NotesAnnotationCardProps = {
    annotation: AllAnnotationsEntry;
    hasFiles?: boolean;
};

export function NotesAnnotationCard({ annotation, hasFiles }: NotesAnnotationCardProps) {
    const isHighlight = annotation.drawer != null;
    const hasText = annotation.text != null;
    const hasNote = annotation.note != null;
    const formattedDate = formatAnnotationDatetime(annotation.datetime);
    const quoteBarClass = isHighlight
        ? colorQuoteBarGradient(annotation.color)
        : '';
    const DrawerIcon = isHighlight
        ? (DRAWER_ICONS[annotation.drawer ?? 'lighten'] ?? DRAWER_ICONS.lighten)
        : null;
    const highlightTextClassName = isHighlight
        ? highlightTextClass(annotation.drawer)
        : '';

    const detailRoute =
        annotation.item_content_type === 'comic'
            ? 'comics-detail'
            : 'books-detail';
    const detailHref = buildRoutePath(detailRoute as 'books-detail', {
        id: annotation.item_id,
    });
    const detailReturnState = createDetailReturnState('/notes');

    const readerRouteId =
        annotation.item_content_type === 'comic'
            ? 'comics-read'
            : 'books-read';
    const readerBaseHref =
        hasFiles && isReaderFormatSupported(annotation.item_format)
            ? buildRoutePath(readerRouteId as 'books-read', {
                  id: annotation.item_id,
              })
            : null;
    const readerHref = annotationReaderHref(
        readerBaseHref,
        isHighlight ? 'highlight' : 'bookmark',
        annotation.id,
    );

    return (
        <article className="bg-white dark:bg-dark-850/50 border border-gray-200/70 dark:border-dark-700/70 rounded-lg overflow-hidden shadow-xs">
            {/* Book info header */}
            <Link
                to={detailHref}
                state={detailReturnState}
                className="flex items-center gap-3 px-4 py-3 bg-gray-50/80 dark:bg-dark-900/40 border-b border-gray-200/50 dark:border-dark-700/50 hover:bg-gray-100/80 dark:hover:bg-dark-800/40 transition-colors"
            >
                <img
                    src={annotation.item_cover_url}
                    alt=""
                    className="w-8 h-11 rounded-sm object-cover shadow-xs shrink-0"
                />
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {annotation.item_title}
                    </p>
                    {annotation.item_authors.length > 0 && (
                        <p className="text-xs text-gray-500 dark:text-dark-400 truncate">
                            {annotation.item_authors.join(', ')}
                        </p>
                    )}
                </div>
            </Link>

            {/* Annotation metadata */}
            <div className="flex items-center justify-between text-sm font-medium text-gray-500 dark:text-dark-400 px-4 py-2.5 border-b border-gray-100/50 dark:border-dark-700/30">
                <div className="flex items-center gap-3 min-w-0">
                    {DrawerIcon && (
                        <span className="hidden sm:inline-flex items-center justify-center px-2 py-1 rounded-md text-xs bg-gray-200/50 dark:bg-dark-700/50 text-gray-500 dark:text-dark-400">
                            <DrawerIcon
                                className="w-3.5 h-3.5"
                                aria-hidden="true"
                            />
                        </span>
                    )}
                    {annotation.chapter && (
                        <span className="inline-flex items-center min-w-0">
                            <LuFileText
                                className="w-4 h-4 mr-1 text-primary-400 shrink-0"
                                aria-hidden="true"
                            />
                            <span className="truncate">
                                {annotation.chapter}
                            </span>
                        </span>
                    )}
                    {typeof annotation.pageno === 'number' && (
                        <span className="hidden sm:inline-flex items-center">
                            <LuHash
                                className="w-4 h-4 mr-1 text-primary-400"
                                aria-hidden="true"
                            />
                            {translation.get('page-number', annotation.pageno)}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {formattedDate && (
                        <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-gray-200/50 dark:bg-dark-700/50 text-gray-500 dark:text-dark-400">
                            <LuClock3 className="w-3.5 h-3.5" aria-hidden="true" />
                            {formattedDate}
                        </span>
                    )}
                    {readerHref && (
                        <Link
                            to={readerHref}
                            title={translation.get('open-at-annotation')}
                            aria-label={translation.get('open-at-annotation')}
                            className="inline-flex items-center justify-center gap-1.5 w-8 h-8 sm:w-auto sm:h-auto px-0 sm:px-2.5 py-1 rounded-md text-xs font-medium text-primary-600 dark:text-primary-300 bg-primary-500/10 hover:bg-primary-500/20 border border-primary-500/20 hover:border-primary-500/30 transition-colors"
                        >
                            <LuBookOpen
                                className="w-3.5 h-3.5"
                                aria-hidden="true"
                            />
                            <span className="hidden sm:inline">
                                {translation.get('open-in-reader')}
                            </span>
                        </Link>
                    )}
                </div>
            </div>

            {/* Content body */}
            {(hasText || hasNote) && (
                <div className="p-5">
                    {hasText && (
                        <div className="relative">
                            <div
                                className={`absolute top-0 left-0 w-1 h-full bg-linear-to-b ${quoteBarClass} rounded-full`}
                            />
                            <blockquote className="text-gray-900 dark:text-white text-base leading-relaxed pl-5 font-light whitespace-pre-wrap">
                                {highlightTextClassName ? (
                                    <span
                                        className={highlightTextClassName}
                                        style={{
                                            boxDecorationBreak: 'clone',
                                            WebkitBoxDecorationBreak: 'clone',
                                        }}
                                    >
                                        {annotation.text}
                                    </span>
                                ) : (
                                    annotation.text
                                )}
                            </blockquote>
                        </div>
                    )}

                    {hasNote && (
                        <div className={hasText ? 'mt-5' : ''}>
                            {isHighlight && hasText && (
                                <div className="flex items-center mb-3">
                                    <div className="h-px bg-gray-200 dark:bg-dark-700 grow mr-3" />
                                    <div className="flex items-center space-x-2">
                                        <div className="w-5 h-5 bg-primary-500/20 dark:bg-linear-to-br dark:from-primary-500 dark:to-primary-600 rounded-full flex items-center justify-center">
                                            <LuNotebookPen
                                                className="w-2.5 h-2.5 text-primary-600 dark:text-white"
                                                aria-hidden="true"
                                            />
                                        </div>
                                        <span className="text-xs font-medium text-primary-400 uppercase tracking-wider">
                                            {translation.get('my-note')}
                                        </span>
                                    </div>
                                    <div className="h-px bg-gray-200 dark:bg-dark-700 grow ml-3" />
                                </div>
                            )}
                            <div className="bg-gray-100 dark:bg-dark-850/50 p-3.5 rounded-lg border border-gray-200 dark:border-dark-700/30">
                                <p className="text-sm text-gray-700 dark:text-dark-200 leading-relaxed whitespace-pre-wrap">
                                    {annotation.note}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Bookmark without text or note — show type indicator */}
            {!isHighlight && !hasText && !hasNote && (
                <div className="px-5 py-4 text-sm text-gray-400 dark:text-dark-500 italic">
                    {translation.get('page-bookmark')}
                </div>
            )}
        </article>
    );
}
