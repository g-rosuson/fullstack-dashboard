import JobDetails from '../shared/jobDetails/JobDetails';
import DropdownMenu from '@/components/ui-app/dropdownMenu/DropdownMenu';

import type { JobCardProps } from './JobCard.types';

import constants from '../../constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const JobCard = ({ job, isRunning, onOpen, onEdit, onDelete }: JobCardProps) => {
    // Determine navigation items
    const navItems = [
        {
            label: constants.labels.edit,
            onClick: () => onEdit(job),
        },
        {
            label: constants.labels.open,
            onClick: () => onOpen(job),
        },
        {
            label: constants.labels.delete,
            variant: 'destructive' as const,
            onClick: () => onDelete(job.id),
        },
    ];

    return (
        <Card className="gap-2 cursor-pointer" onClick={() => onOpen(job)}>
            <CardHeader>
                <div className="min-w-0 flex items-start justify-between gap-2">
                    <CardTitle className="truncate">{job.name}</CardTitle>

                    <DropdownMenu dropdownItems={navItems} />
                </div>
            </CardHeader>

            <CardContent>
                <JobDetails job={job} isRunning={isRunning} />
            </CardContent>
        </Card>
    );
};

export default JobCard;
