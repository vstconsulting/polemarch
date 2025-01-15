<template>
    <router-link :to="{ name: 'home' }" class="brand-link logo app-logo">
        <img
            src="./../assets/logo/logo.png"
            :alt="title"
            class="brand-image img-circle elevation-3"
            style="opacity: 0.8; float: inherit"
        />
        <img
            src="./../assets/logo/horizontal.svg"
            :alt="title"
            class="brand-image text-logo"
            style="opacity: 0.8"
        />
    </router-link>
</template>

<script setup lang="ts">
defineProps<{
    title?: string;
}>();
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
