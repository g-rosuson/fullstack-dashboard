import Button from '@/components/blocks/button/Button';
import Flex from '@/components/blocks/flex/Flex';
import Text from '@/components/blocks/text/Text';

const WithPermission = ({ label }: { label: string }) => {
    return (
        <Flex
            gap="sm"
            direction="row"
            justify="between"
            align="center"
            className="px-md py-sm transparent border border-border rounded-md">
            <Text size="xs">{label}</Text>

            <Flex direction="row" gap="xs" className="w-fit">
                <Button variant="secondary" label="Allow" size="xs" />
                <Button variant="ghost" label="Deny" size="xs" />
            </Flex>
        </Flex>
    );
};

export default WithPermission;
