<template>
    <div style="display: contents;">
        <div class="in-loading" v-if="loading">
            <div id="loader-wrapper">
                <div id="loader"></div>
            </div>
        </div>

        <div class="content-wrapper-2" v-if="error">
            <section class="content-header">
                <div class="container-fluid">
                    <div class="row">
                        <div class="col-lg-6">
                            <h1>
                                <span
                                    @click="goToHistoryRecord(-1)"
                                    class="btn btn-default btn-previous-page"
                                >
                                    <span class="fa fa-arrow-left"></span>
                                </span>
                                <span class="h1-header">Error {{ error.status }}</span>
                            </h1>
                        </div>
                        <div class="col-lg-6">
                            <breadcrumbs :breadcrumbs="breadcrumbs"></breadcrumbs>
                        </div>
                    </div>
                </div>
            </section>
            <section class="content">
                <div class="container-fluid">
                    <div class="row">
                        <div class="col-lg-12"></div>
                    </div>
                    <div class="row">
                        <div class="col-lg-12">
                            <div class="error-text-wrapper">
                                <p class="text-center error-p">{{ error_data }}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>

        <div class="content-wrapper-2" id="spajs-right-area" v-if="response">
            <section class="content-header">
                <div class="container-fluid">
                    <div class="row">
                        <div class="col-lg-6">
                            <h1>
                                <span
                                    @click="goToHistoryRecord(-1)"
                                    class="btn btn-default btn-previous-page"
                                >
                                    <span class="fa fa-arrow-left"></span>
                                </span>
                                <span class="h1-header">{{ title | capitalize | split }}</span>
                            </h1>
                        </div>
                        <div class="col-lg-6">
                            <breadcrumbs :breadcrumbs="breadcrumbs"></breadcrumbs>
                        </div>
                    </div>
                </div>
            </section>
            <section class="content">
                <div class="container-fluid">
                    <div class="row">
                        <div class="col-lg-12">
                            <gui_buttons_row :view="view" :data="data" :opt="opt"></gui_buttons_row>
                        </div>
                    </div>
                    <br />
                    <div class="row">
                        <section class="col-lg-12 col col-xl-9">
                            <!-- Section with Inventory fields -->
                            <section>
                                <div class="card card-info">
                                    <div class="card-header with-border card-header-custom">
                                        <field_fk_just_value
                                            :field="inventory_field"
                                            :wrapper_opt="inventory_field_wrapper_opt"
                                            :prop_data="inventory_field_prop_data"
                                        ></field_fk_just_value>
                                        <!-- Button for collapse  and expand this section -->
                                        <button
                                            type="button"
                                            class="btn btn-card-tool btn-sm btn-light btn-icon"
                                            @click="inventory_toggle = !inventory_toggle"
                                            style="float: right;"
                                        >
                                            <i
                                                class="fa fa-plus"
                                                :class="inventory_toggle ? 'fa-minus' : 'fa-plus'"
                                            ></i>
                                        </button>
                                    </div>
                                    <transition name="fade">
                                        <div class="card-body card-body-custom" v-show="inventory_toggle">
                                            <field_one_history_raw_inventory
                                                :field="raw_inventory_field"
                                                :wrapper_opt="inventory_field_wrapper_opt"
                                                :prop_data="inventory_field_prop_data"
                                            ></field_one_history_raw_inventory>
                                        </div>
                                    </transition>
                                </div>
                            </section>

                            <!-- Section with output information -->
                            <section>
                                <div class="card card-info">
                                    <div class="card-header with-border card-header-custom">
                                        <span>{{ $t('execution output') | capitalize }}</span>

                                        <!-- Button for collapse  and expand this section -->
                                        <button
                                            type="button"
                                            class="btn btn-card-tool btn-sm btn-light btn-icon"
                                            style="float: right;"
                                            @click="output_toggle = !output_toggle"
                                        >
                                            <i
                                                class="fa fa-plus"
                                                :class="output_toggle ? 'fa-minus' : 'fa-plus'"
                                            ></i>
                                        </button>

                                        <clear_button
                                            v-show="clear_button_show"
                                            type="action"
                                            :options="clear_button_options"
                                            :look="clear_button_look"
                                        ></clear_button>
                                    </div>
                                    <transition name="fade">
                                        <div
                                            class="card-body card-body-custom"
                                            style="padding: 0 7.5px;"
                                            v-show="output_toggle"
                                        >
                                            <history_stdout
                                                :instance="data.instance"
                                                :url="url"
                                                :cleared="was_cleared"
                                            ></history_stdout>
                                        </div>
                                    </transition>
                                    <transition name="fade">
                                        <div
                                            class="card-footer clearfix"
                                            v-if="content_footer_component && !card_collapsed"
                                        >
                                            <component
                                                :is="content_footer_component"
                                                :data="data"
                                                :view="view"
                                                :opt="opt"
                                            ></component>
                                        </div>
                                    </transition>
                                </div>
                                <component
                                    :is="content_additional"
                                    :data="data"
                                    :view="view"
                                    :opt="opt"
                                    v-if="content_additional"
                                ></component>
                            </section>
                        </section>

                        <!-- Section with information about task -->
                        <!--<section class="col-lg-8 col-xl-3 col-lg-8">-->
                        <section class="col-lg-12 col-xl-3">
                            <div class="card card-info">
                                <div class="card-header with-border card-header-custom">
                                    <span>{{ $t('detail') | capitalize }}</span>
                                    <!-- Button for collapse  and expand this section -->
                                    <button
                                        type="button"
                                        class="btn btn-card-tool btn-sm btn-light btn-icon"
                                        @click="information_toggle = !information_toggle"
                                        style="float: right;"
                                    >
                                        <i
                                            class="fa fa-plus"
                                            :class="information_toggle ? 'fa-minus' : 'fa-plus'"
                                        ></i>
                                    </button>
                                </div>
                                <transition name="fade">
                                    <div
                                        class="card-body card-body-custom details"
                                        v-show="information_toggle"
                                    >
                                        <component
                                            :is="content_body_component"
                                            :data="data"
                                            :view="view"
                                            :opt="opt"
                                        ></component>
                                    </div>
                                </transition>
                                <transition name="fade">
                                    <div
                                        class="card-footer clearfix"
                                        v-if="content_footer_component && !card_collapsed"
                                    >
                                        <component
                                            :is="content_footer_component"
                                            :data="data"
                                            :view="view"
                                            :opt="opt"
                                        ></component>
                                    </div>
                                </transition>
                            </div>
                            <component
                                :is="content_additional"
                                :data="data"
                                :view="view"
                                :opt="opt"
                                v-if="content_additional"
                            ></component>
                        </section>
                    </div>
                </div>
            </section>
        </div>
    </div>
</template>

<script>
    import HistoryStdout from './HistoryStdout.vue';
    const guiFields = spa.fields.guiFields;

    /**
     * Mixin for /history/{pk}/ view.
     */
    export default {
        data: function () {
            return {
                inventory_toggle: false,
                output_toggle: true,
                information_toggle: true,

                was_cleared: undefined,
            };
        },
        /**
         * Redefinition of 'beforeRouteUpdate' hook of view_with_autoupdate_mixin.
         */
        beforeRouteUpdate(to, from, next) {
            /* jshint unused: false */
            this.stopChildrenAutoUpdate();
            this.stopAutoUpdate();
            next();
        },
        /**
         * Redefinition of 'beforeRouteUpdate' hook of view_with_autoupdate_mixin.
         */
        beforeRouteLeave(to, from, next) {
            /* jshint unused: false */
            this.stopChildrenAutoUpdate();
            this.stopAutoUpdate();
            this.$destroy();
            next();
        },
        computed: {
            /**
             * Property, that returns inventory field instance from inventory section.
             */
            inventory_field() {
                let options = $.extend(true, {}, this.view.objects.model.fields.inventory.options);
                options.format = 'fk_just_value';
                options.hidden = false;
                let field = new guiFields.fk_just_value(options);
                field = guiFields.fk_just_value.prepareField(field, this.$route.name);
                return field;
            },
            /**
             * Property, that returns prop data for inventory field from inventory section
             */
            inventory_field_prop_data() {
                return this.data.instance.data;
            },
            /**
             * Property, that returns wrapper_opt object for inventory field from inventory section
             */
            inventory_field_wrapper_opt() {
                return {
                    use_prop_data: true,
                    readOnly: true,
                };
            },
            /**
             * Property, that returns raw inventory field instance from inventory section.
             */
            raw_inventory_field() {
                let options = $.extend(true, {}, this.view.objects.model.fields.raw_inventory.options);
                options.format = 'one_history_raw_inventory';
                options.hidden = false;
                let field = new guiFields.one_history_raw_inventory(options);
                return field;
            },
            /**
             * Property, that is responsible for showing and hiding of clear button.
             */
            clear_button_show() {
                if (this.data.instance.data && !['RUN', 'DELAY'].includes(this.data.instance.data.status)) {
                    return true;
                }

                return false;
            },
            /**
             * Property, that returns object with options for clear button.
             */
            clear_button_options() {
                return {
                    name: 'clear',
                };
            },
            /**
             * Property, that returns object with look options for clear button.
             */
            clear_button_look() {
                return {
                    icon_classes: ['fa', 'fa-trash', 'fa-lg'],
                    title_classes: ['clear-btn-title'],
                    classes: [
                        'btn',
                        'btn-card-tool',
                        'btn-sm',
                        'btn-light',
                        'btn-icon',
                        'clear-btn',
                        'hidden-button',
                    ],
                };
            },
        },
        methods: {
            /**
             * Stops autoupdate of history_stdout component.
             */
            stopChildrenAutoUpdate() {
                this.$children.forEach((child) => {
                    if (child.stopAutoUpdate && typeof child.stopAutoUpdate == 'function') {
                        child.stopAutoUpdate();
                    }
                });
            },
            /**
             * Method, that sends API request for cleaning of history stdout.
             */
            clearInstance() {
                let qs = this.getQuerySet(this.view, this.qs_url).clone({ url: this.qs_url + '/clear' });

                qs.formQueryAndSend('delete')
                    .then((response) => {
                        /* jshint unused: false */
                        spa.popUp.guiPopUp.success(
                            spa.popUp.pop_up_msg.instance.success.execute.format([
                                'clear',
                                this.view.schema.name,
                            ]),
                        );

                        this.was_cleared = true;
                    })
                    .catch((error) => {
                        let str = app.error_handler.errorToString(error);

                        let srt_to_show = spa.popUp.pop_up_msg.instance.error.execute.format([
                            'clear',
                            this.view.schema.name,
                            str,
                        ]);

                        app.error_handler.showError(srt_to_show, str);
                    });
            },
        },
        components: {
            /**
             * Component for clear history stdout button.
             */
            clear_button: {
                mixins: [spa.components.mixins.BaseButtonMixin],
            },
            /**
             * Component, that is responsible for loading and showing history stdout output.
             */
            history_stdout: HistoryStdout,
        },
    };
</script>

<style scoped></style>
