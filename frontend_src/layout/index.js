import Logo from './Logo.vue';

spa.signals.once('app.beforeInit', ({ app }) => {
    app.appRootComponent = {
        mixins: [spa.AppRoot],
        components: { Logo },
    };
});
