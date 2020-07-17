<template>
    <a href="/" class="brand-link logo app-logo">
        <img
            :src="staticPath + 'img/logo/logo.png'"
            :alt="title"
            class="brand-image img-circle elevation-3"
            style="opacity: 0.8; float: inherit;"
        />
        <img
            :src="staticPath + 'img/logo/horizontal.svg'"
            :alt="title"
            class="brand-image text-logo"
            style="opacity: 0.8;"
        />
    </a>
</template>

<script>
    export default {
        name: 'Logo',
        mixins: [spa.components.items.Logo],
        computed: {
            /**
             * Property, that returns path to directory with static files.
             * @returns {string}.
             */
            staticPath() {
                return window.guiStaticPath || '/static/';
            },
        },
    };
</script>

<style scoped></style>
