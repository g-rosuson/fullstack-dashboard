import type { JobFormSheetTool } from '../JobSheet.types';

import { EmailToolType, ScraperToolType } from '@/_types/_gen';

/**
 * The type of tool.
 */
type ToolType = ScraperToolType | EmailToolType | null;

/**
 * The props of the tool dialog.
 */
interface ToolDialogProps {
    isOpen: boolean;

    toolToEdit: JobFormSheetTool | null;
    // eslint-disable-next-line no-unused-vars
    onOpenChange: (open: boolean) => void;
    onToolAdd: (value: JobFormSheetTool) => void;
    onToolEdit: (value: JobFormSheetTool) => void;
}

export type { ToolDialogProps, ToolType };
