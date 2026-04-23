import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

import type { DatePickerProps } from './DatePicker.types';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { FieldLabel } from '@/components/ui/field';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const DatePicker = ({ value, label, onChange, placeholder = 'Pick a date', disabled, required }: DatePickerProps) => {
    // State
    const [open, setOpen] = useState(false);

    // Ref
    const datePickerRef = useRef<HTMLInputElement>(null);

    /**
     * Converts the selected Date to a YYYY-MM-DD string and forwards it to onChange.
     */
    const onSelect = (date: Date | undefined) => {
        onChange(date ? date : null);
        setOpen(false);
    };

    /**
     * Programmatically set the validity of the input element based
     * whether its required and has a date selected.
     * @param required - Whether the field is required
     * @param value - The value of the date picker
     */
    useEffect(() => {
        if (!datePickerRef.current) return;

        const message = required && !value ? 'Please select a date to continue' : '';
        datePickerRef.current.setCustomValidity(message);
    }, [required, value]);

    // Generate the trigger ID
    const triggerId = `date-picker-${label.toLowerCase().replace(/\s+/g, '-')}`;

    return (
        <div className="w-full flex flex-col gap-2">
            <FieldLabel htmlFor={triggerId} className="gap-0.5">
                {label}
                {required && <span className="text-destructive">*</span>}
            </FieldLabel>

            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        id={triggerId}
                        variant="outline"
                        disabled={disabled}
                        className={cn('w-full justify-start font-normal', !value && 'text-muted-foreground')}>
                        <CalendarIcon />
                        {value ? format(value, 'PPP') : placeholder}

                        <input
                            name="required-hidden-input"
                            type="text"
                            required={required}
                            value={value ? value.toString() : ''}
                            // noop to satisfy React
                            onChange={() => {}}
                            ref={datePickerRef}
                            className="sr-only"
                        />
                    </Button>
                </PopoverTrigger>

                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={value} onSelect={onSelect} autoFocus />
                </PopoverContent>
            </Popover>
        </div>
    );
};

export default DatePicker;
