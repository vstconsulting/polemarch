import { initApp } from '@vstconsulting/vstutils';
import { createAuthApp } from './auth';

import './common';

initApp({
    createAuthApp,
    api: {
        url: new URL('/api/', window.location.origin).toString(),
    },
});
