from celery.beat import PersistentScheduler

from ihservice.main.utils import Lock


class SingletonPersistentScheduler(PersistentScheduler):
    cloudns_lock = None

    def tick(self, *args, **kwargs):
        if self.cloudns_lock is None:
            try:
                self.cloudns_lock = Lock(Lock.SCHEDULER)
            except Lock.AcquireLockException:
                return 5.0
        return super(SingletonPersistentScheduler,
                     self).tick(*args, **kwargs)

    def close(self):
        if self.cloudns_lock is not None:
            self.cloudns_lock.release()

        return super(SingletonPersistentScheduler,
                     self).close()