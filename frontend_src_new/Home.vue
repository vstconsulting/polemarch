<template>
    <div class="container-fluid">
        <div class="row">
            <div class="col-3">
                <SmallBoxWidget :value="2" label="fghgf" href="fghghfjh" />
            </div>
        </div>
    </div>
</template>

<script>
    export default {
        components: {
            SmallBoxWidget: spa.components.widgets.SmallBoxWidget,
        },
        mixins: [spa.views.mixins.BasestViewMixin],
    };
</script>
