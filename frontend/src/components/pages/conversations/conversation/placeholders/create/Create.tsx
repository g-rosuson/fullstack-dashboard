import Flex from '@/components/blocks/flex/Flex';
import Text from '@/components/blocks/text/Text';

const Create = () => {
    return (
        <Flex className="h-full" direction="row" justify="center" align="center" gap="md">
            <div className="animate-pulse h-5 w-5 rounded-full bg-primary" />

            <Text size="xl">Creating conversation</Text>
        </Flex>
    );
};

export default Create;
