<template>
    <!-- eslint-disable-next-line vue/no-v-html -->
    <span v-html="htmlContent" />
</template>

<script setup>
    import { computed } from 'vue';

    const props = defineProps({
        content: { type: String, required: true },
    });

    const htmlContent = computed(() => {
        return spa.colors.ansiToHTML(props.content);
    });
</script>
