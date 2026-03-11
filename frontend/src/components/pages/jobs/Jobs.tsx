import { useEffect, useState } from 'react';
import { JobDocument } from '_types/_gen';

import Heading from 'components/UI/heading/Heading';

import api from 'api';

interface State {
    jobs: JobDocument[];
    isLoading: boolean;
}

const Jobs = () => {
    const [state, setState] = useState<State>({
        jobs: [],
        isLoading: false,
    });

    /**
     * Creates a job with the given payload.
     */
    const createJob = async () => {
        try {
            const payload = {
                name: 'FE-dev_jobsCh_two',
                schedule: null,
                tools: [
                    {
                        type: 'scraper' as const,
                        targets: [
                            {
                                target: 'jobs-ch' as const,
                                maxPages: 5,
                            },
                            {
                                target: 'jobs-ch' as const,
                                maxPages: 5,
                                keywords: ['Design', 'ui', 'ux', 'ui/ux', 'figma'],
                            },
                        ],
                        keywords: ['frontend developer', 'react', 'next'],
                        maxPages: 5,
                    },
                ],
            };

            const response = await api.service.resources.jobs.create(payload);

            console.log(response);

            setState(prevState => ({
                ...prevState,
                jobs: [...prevState.jobs, response.data],
            }));
        } catch (error) {
            console.log(error);
        }
    };

    /**
     * Fetches all jobs on mount, opens an SSE stream, and cleans up on unmount.
     */
    useEffect(() => {
        const fetchAllJobs = async () => {
            try {
                const response = await api.service.resources.jobs.getAll();

                setState(prevState => ({
                    ...prevState,
                    jobs: response.data,
                }));
            } catch (error) {
                console.log(error);
            } finally {
                setState(prevState => ({
                    ...prevState,
                    isLoading: false,
                }));
            }
        };

        fetchAllJobs();

        const subscription = api.service.resources.jobs.streamAll({
            onMessage(event, data) {
                // TODO: Nothing is emmited here when no events exists
                console.log(event, data);
            },
            onError: err => console.error('Stream error:', err),
        });

        return () => {
            subscription.close();
        };
    }, []);

    return (
        <div>
            <Heading size="l" level={2}>
                Jobs
            </Heading>

            <section>
                {state.jobs.map((job, index) => (
                    <article key={index}>
                        <Heading size="m" level={3}>
                            {job.name}
                        </Heading>
                    </article>
                ))}
            </section>

            <section>
                <button onClick={createJob}>Create Job</button>
            </section>

            <section>
                <button onClick={createJob}>Update Job</button>
            </section>
        </div>
    );
};

export default Jobs;
