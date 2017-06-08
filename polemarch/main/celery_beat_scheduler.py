from django_celery_beat.schedulers import DatabaseScheduler

from ..main.utils import Lock


class SingletonDatabaseScheduler(DatabaseScheduler):
    scheduler_lock = None

    def tick(self, *args, **kwargs):
        if self.scheduler_lock is None:
            try:
                self.scheduler_lock = Lock(Lock.SCHEDULER, timeout=120.0)
            except Lock.AcquireLockException:
                return 60.0
        self.scheduler_lock.prolong()
        return super(SingletonDatabaseScheduler,
                     self).tick(*args, **kwargs)

    def close(self):
        if self.scheduler_lock is not None:
            self.scheduler_lock.release()

        return super(SingletonDatabaseScheduler,
                     self).close()
