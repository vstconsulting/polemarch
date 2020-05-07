<template>
    <div style="display: contents;" v-show="!is_hidden">
        <div style="display: contents;" v-show="!is_hidden">
            <div :class="wrapper_classes" :style="wrapper_styles">
                <field_content_readonly
                    :value="value"
                    :field="field"
                    :wrapper_opt="wrapper_opt"
                    :data="data"
                    @proxyEvent="proxyEvent"
                ></field_content_readonly>
                <!--<field_description :value="value" :field="field" :wrapper_opt="wrapper_opt" :data="data"></field_description>-->
            </div>
        </div>
    </div>
</template>
