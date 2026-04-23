import Tabs from '@/components/ui-app/tabs/Tabs';

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
                            <div className="font-bold text-sm">Identifier </div>
                            <span className="text-xs">{target.targetId}</span>
                        </div>
                        <div>
                            <div className="font-bold text-sm">Keywords </div>
                            <span className="text-xs">{target.keywords?.join(', ')}</span>
                        </div>

                        <div>
                            <div className="font-bold text-sm">Max pages </div>
                            <span className="text-xs">{target.maxPages}</span>
                        </div>
                    </section>

                    <section>
                        <h2 className="font-bold text-base mb-3">
                            Results <span className="text-sm font-normal">({target.results.length})</span>
                        </h2>

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
                    <div className="font-bold text-sm">Identifier </div>
                    <span className="text-xs">{tool.toolId}</span>
                </div>
                <div>
                    <div className="font-bold text-sm">Keywords </div>
                    <span className="text-xs">{tool.keywords?.join(', ')}</span>
                </div>

                <div>
                    <div className="font-bold text-sm">Max pages </div>
                    <span className="text-xs">{tool.maxPages}</span>
                </div>
            </section>

            <section className="pl-4">
                <h2 className="font-bold text-base">
                    Targets <span className="text-sm font-normal">({tool.targets.length})</span>
                </h2>

                <Tabs tabs={mapToTabs(tool.targets).tabs} tabContents={mapToTabs(tool.targets).tabContents} />
            </section>
        </div>
    );
};

export default ScraperToolPanel;
