import { LuArrowDownAZ, LuClock } from 'react-icons/lu';

import { translation } from '../../../shared/i18n';
import { Button } from '../../../shared/ui/button/Button';
import type { LibrarySortOrder } from '../model/library-model';

type LibrarySortToggleProps = {
    value: LibrarySortOrder;
    onToggle: () => void;
};

const SORT_ICONS = {
    'last-opened': LuClock,
    alphabetical: LuArrowDownAZ,
};

const SORT_LABEL_KEYS: Record<LibrarySortOrder, string> = {
    'last-opened': 'library-sort.last-opened',
    alphabetical: 'library-sort.alphabetical',
};

export function LibrarySortToggle({ value, onToggle }: LibrarySortToggleProps) {
    const Icon = SORT_ICONS[value];

    return (
        <Button
            variant="neutral"
            icon={Icon}
            label={translation.get(SORT_LABEL_KEYS[value])}
            aria-label={translation.get(SORT_LABEL_KEYS[value])}
            onClick={onToggle}
        />
    );
}
