import { onAppBeforeInit } from '@vstconsulting/vstutils';
import Logo from './Logo.vue';

onAppBeforeInit(({ app }) => {
    app.additionalRootMixins.push({
        components: { Logo },
    });
});
