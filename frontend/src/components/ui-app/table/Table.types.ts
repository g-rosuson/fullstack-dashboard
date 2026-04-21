import type { ColumnDef } from '@tanstack/react-table';

/**
 * The props for the DataTable component.
 */
interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
}

export type { DataTableProps };
