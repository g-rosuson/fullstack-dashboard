import DataTable from '@/components/ui-app/table/Table';

import type { ScraperTargetProps, ScraperTargetRow } from './types/Scraper.types';
import type { ColumnDef } from '@tanstack/react-table';

const ScraperTarget = ({ target }: ScraperTargetProps) => {
    const rows: ScraperTargetRow[] = [];

    const columns: ColumnDef<ScraperTargetRow>[] = [
        { header: 'Title', accessorKey: 'title' },
        {
            header: 'URL',
            accessorKey: 'url',
            cell: ({ row }) => {
                const url = row.original.url;
                if (!url || url === 'n/a') {
                    return 'n/a';
                }
                return (
                    <a href={url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                        {url}
                    </a>
                );
            },
        },
    ];

    for (const resultItem of target.results) {
        if ('error' in resultItem.listing) {
            const errorRow = {
                title: resultItem.listing.error.message || resultItem.listing.error.code || 'n/a',
                url: resultItem.listing.url?.trim() ? resultItem.listing.url : 'n/a',
            };
            rows.push(errorRow);
        } else {
            const successRow = {
                title: resultItem.listing.title?.trim() ? resultItem.listing.title : 'n/a',
                url: resultItem.listing.url?.trim() ? resultItem.listing.url : 'n/a',
            };
            rows.push(successRow);
        }
    }

    return <DataTable data={rows} columns={columns} />;
};

export default ScraperTarget;
