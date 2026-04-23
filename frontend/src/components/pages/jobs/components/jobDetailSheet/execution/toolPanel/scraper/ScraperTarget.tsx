import DataTable from '@/components/ui-app/table/Table';

import type { ScraperTargetProps, ScraperTargetRow } from './types/Scraper.types';

const ScraperTarget = ({ target }: ScraperTargetProps) => {
    const rows: ScraperTargetRow[] = [];

    const columns = [
        {
            header: 'Title',
            accessorKey: 'title',
        },
        {
            header: 'URL',
            accessorKey: 'url',
        },
    ];

    for (const resultItem of target.results) {
        rows.push({
            title: resultItem.result?.title || 'n/a',
            url: resultItem.result?.url ?? 'n/a',
        });
    }

    return <DataTable data={rows} columns={columns} />;
};

export default ScraperTarget;
