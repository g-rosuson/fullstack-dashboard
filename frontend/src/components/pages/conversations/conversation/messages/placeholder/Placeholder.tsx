import Flex from '@/components/blocks/flex/Flex';
const Placeholder = () => {
    return (
        <Flex align="center" justify="center" className="h-full">
            <p className="text-sm text-foreground">
                No conversation history exists yet, send a prompt to get started...
            </p>
        </Flex>
    );
};

export default Placeholder;
