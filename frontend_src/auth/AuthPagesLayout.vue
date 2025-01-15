<template>
    <div class="wrapper">
        <LangForm />

        <div class="page">
            <img
                src="./../assets/logo/vertical.png"
                alt="Polemarch logo"
                class="mx-auto d-block logo-img"
                style="margin-bottom: 40px; width: 50%"
            />
            <slot />
        </div>
    </div>
</template>

<script setup lang="ts">
import { LangForm } from '@vstconsulting/vstutils/auth-app';
</script>

<style scoped>
    .wrapper {
        position: absolute;
        width: 100vw;
        height: 100vh;
        background-color: #e9ecef;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .page {
        max-width: 450px;
        background-color: #fff;
        padding: 20px;
        border-radius: 0.25rem;
        width: 400px;
        max-width: 100%;
        margin: 10px;
    }
</style>
