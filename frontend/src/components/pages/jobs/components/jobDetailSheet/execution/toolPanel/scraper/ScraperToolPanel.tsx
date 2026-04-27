import Heading from '@/components/ui-app/heading/Heading';
import Tabs from '@/components/ui-app/tabs/Tabs';
import Text from '@/components/ui-app/text/Text';

import type { ScraperToolPanelProps } from './types/Scraper.types';

import ScraperTarget from './ScraperTarget';
import { ExecutionScraperToolTarget } from '@/_types/_gen';
import utils from '@/utils';

const ScraperToolPanel = ({ tool }: ScraperToolPanelProps) => {
    /**
     * Maps the targets to tabs and tab contents.
     */
    const mapToTabs = (targets: ExecutionScraperToolTarget[]) => {
        const tabs = targets.map(target => ({
            value: target.targetId,
            label: utils.string.capitalize(target.target),
        }));

        const tabContents = targets.map(target => ({
            value: target.targetId,
            children: (
                <div>
                    <section className="flex flex-col gap-2 p-3 my-3 border rounded-md">
                        <div>
                            <Heading level={3} size="xs">
                                Identifier
                            </Heading>
                            <Text size="xs">{target.targetId}</Text>
                        </div>
                        <div>
                            <Heading level={3} size="xs">
                                Keywords
                            </Heading>
                            <Text size="xs">{target.keywords?.join(', ')}</Text>
                        </div>

                        <div>
                            <Heading level={3} size="xs">
                                Max pages
                            </Heading>
                            <Text size="xs">{target.maxPages}</Text>
                        </div>
                    </section>

                    <section>
                        <Heading size="s" level={2}>
                            Results <span className="text-sm font-normal">({target.results.length})</span>
                        </Heading>

                        <ScraperTarget target={target} />
                    </section>
                </div>
            ),
        }));

        return { tabs, tabContents };
    };

    return (
        <div>
            <section className="flex flex-col gap-2 p-3 my-3 border rounded-md">
                <div>
                    <Heading level={3} size="xs">
                        Identifier
                    </Heading>
                    <Text size="xs">{tool.toolId}</Text>
                </div>
                <div>
                    <Heading level={3} size="xs">
                        Keywords
                    </Heading>
                    <Text size="xs">{tool.keywords?.join(', ')}</Text>
                </div>

                <div>
                    <Heading level={3} size="xs">
                        Max pages
                    </Heading>
                    <Text size="xs">{tool.maxPages}</Text>
                </div>
            </section>

            <section className="pl-4">
                <Heading size="s" level={2}>
                    Targets <span className="text-sm font-normal">({tool.targets.length})</span>
                </Heading>

                <Tabs tabs={mapToTabs(tool.targets).tabs} tabContents={mapToTabs(tool.targets).tabContents} />
            </section>
        </div>
    );
};

export default ScraperToolPanel;
