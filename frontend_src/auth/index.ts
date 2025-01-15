import { customizeDefaultAuthAppCreator } from '@vstconsulting/vstutils/auth-app';
import AuthPagesLayout from './AuthPagesLayout.vue';

export const createAuthApp = customizeDefaultAuthAppCreator({
    components: {
        layout: AuthPagesLayout,
    },
});
