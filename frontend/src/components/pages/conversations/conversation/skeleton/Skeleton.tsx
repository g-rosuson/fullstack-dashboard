import Flex from '@/components/blocks/flex/Flex';
import SkeletonBlock from '@/components/blocks/skeleton/Skeleton';

const Skeleton = () => {
    return (
        <Flex className="h-full" direction="column" justify="between" align="center" gap="md">
            <Flex direction="column" gap="md">
                <Flex justify="start">
                    <SkeletonBlock className="h-10 w-100" />
                </Flex>

                <Flex justify="end">
                    <SkeletonBlock className="h-10 w-80" />
                </Flex>

                <Flex justify="start">
                    <SkeletonBlock className="h-10 w-70" />
                </Flex>

                <Flex justify="end">
                    <SkeletonBlock className="h-10 w-90" />
                </Flex>

                <Flex justify="start">
                    <SkeletonBlock className="h-10 w-90" />
                </Flex>

                <Flex justify="end">
                    <SkeletonBlock className="h-10 w-90" />
                </Flex>
            </Flex>
        </Flex>
    );
};

export default Skeleton;
