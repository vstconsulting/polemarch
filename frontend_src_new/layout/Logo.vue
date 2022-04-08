<template>
    <router-link :to="{ name: 'home' }" class="brand-link logo app-logo">
        <img
            :src="$app.config.staticPath + 'img/logo/logo.png'"
            :alt="title"
            class="brand-image img-circle elevation-3"
            style="opacity: 0.8; float: inherit"
        />
        <img
            :src="$app.config.staticPath + 'img/logo/horizontal.svg'"
            :alt="title"
            class="brand-image text-logo"
            style="opacity: 0.8"
        />
    </router-link>
</template>

<script>
    export default {
        name: 'Logo',
        mixins: [spa.components.items.Logo],
    };
</script>

<style>
    .main-sidebar .app-logo .text-logo {
        margin-left: auto;
        width: 165px;
        float: inherit;
    }

    .sidebar-collapse .text-logo {
        display: none;
    }

    .sidebar-collapse .main-sidebar:hover .text-logo {
        display: inline-block;
    }
</style>
