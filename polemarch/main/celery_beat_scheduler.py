from celery.beat import PersistentScheduler

from polemarch.main.utils import Lock


class SingletonPersistentScheduler(PersistentScheduler):
    scheduler_lock = None

    def tick(self, *args, **kwargs):
        if self.scheduler_lock is None:
            try:
                self.scheduler_lock = Lock(Lock.SCHEDULER)
            except Lock.AcquireLockException:
                return 5.0
        return super(SingletonPersistentScheduler,
                     self).tick(*args, **kwargs)

    def close(self):
        if self.scheduler_lock is not None:
            self.scheduler_lock.release()

        return super(SingletonPersistentScheduler,
                     self).close()
