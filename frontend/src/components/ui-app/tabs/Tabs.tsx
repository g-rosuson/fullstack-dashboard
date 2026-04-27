import Text from '../text/Text';

import type { TabsProps } from './types';

import { Tabs as TabsPrimitive, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Tabs = ({ tabs, tabContents }: TabsProps) => {
    return (
        <TabsPrimitive defaultValue={tabs[0].value}>
            <TabsList variant="line">
                {tabs.map(tab => (
                    <TabsTrigger key={tab.value} value={tab.value} >
                        <Text size="xs" appearance="foreground">
                            {tab.label}
                        </Text>
                    </TabsTrigger>
                ))}
            </TabsList>

            {tabContents.map(content => (
                <TabsContent key={content.value} value={content.value}>
                    {content.children}
                </TabsContent>
            ))}
        </TabsPrimitive>
    );
};

export default Tabs;
