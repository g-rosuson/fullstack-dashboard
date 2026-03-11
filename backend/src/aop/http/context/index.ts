import { DbContext } from 'aop/db/mongo/context';
import { DelegatorContext } from 'aop/delegator/context';
import { EmitterContext } from 'aop/emitter/context';
import { SchedulerContext } from 'aop/scheduler/context';

export class Context {
    db: DbContext;
    delegator: DelegatorContext;
    scheduler: SchedulerContext;
    emitter: EmitterContext;
    user: {
        id: string;
        email: string;
    };
}
