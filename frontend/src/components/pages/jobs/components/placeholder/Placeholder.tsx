import Button from '@/components/blocks/button/Button';
import Flex from '@/components/blocks/flex/Flex';
import illustration from '@/components/blocks/illustration/Illustration';

interface PlaceholderProps {
    openFormSheet: () => void;
}

const placeholder = 'No jobs exist yet, create your first job to get started.';

const Placeholder = ({ openFormSheet }: PlaceholderProps) => {
    return (
        <Flex direction="column" align="center" justify="center" gap="md" className="grow">
            <div className="flex flex-col items-center justify-center gap-md">
                <illustration.NotFound />

                <p className="text-center text-sm text-muted-foreground">{placeholder}</p>
            </div>

            <Button label="Create job" onClick={openFormSheet} />
        </Flex>
    );
};

export default Placeholder;
