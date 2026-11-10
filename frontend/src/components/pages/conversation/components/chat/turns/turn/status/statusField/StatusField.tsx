import Text from '@/components/blocks/text/Text';

interface StatusFieldProps {
    label: string;
    animate?: boolean;
    isError?: boolean;
}

const StatusField = ({ label, animate, isError }: StatusFieldProps) => {
    const variant = isError ? 'destructive' : 'muted';
    return (
        <Text variant={variant} size="xs" className={animate ? 'animate-pulse' : undefined}>
            {label}
        </Text>
    );
};

export default StatusField;
