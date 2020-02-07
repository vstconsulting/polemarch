/**
 * Inventory autocomplete guiField class.
 */
guiFields.inventory_autocomplete = class InventoryAutocompleteField extends guiFields.fk_multi_autocomplete {
    /**
     * Redefinition of 'toInner' method of fk_multi_autocomplete guiField.
     */
    toInner(data) {
        let val, value;
        val = value = data[this.options.name];

        if(!value) {
            return;
        }

        if(value && typeof value == "object") {
            val = value.value;
        }

        if(!val) {
            return;
        }

        if(!isNaN(Number(val))) {
            return val;
        }

        if(val[val.length-1] == ",") {
            return val;
        }

        let prefix = './';

        if(val.substr(0,2) == prefix) {
            return val;
        }

        return prefix + val;
    }

    /**
     * Method, that defines - make prefetch or not.
     * @param {object} data Instance data.
     * @return {boolean}
     * @private
     */
    _prefetchDataOrNot(data) {
        let value = this.toInner(data);

        if(!isNaN(Number(value))) {
            return true;
        }

        return false;
    }
    /**
     * Redefinition of 'prefetchDataOrNot' method of fk_multi_autocomplete guiField.
     */
    prefetchDataOrNot(data) {
        return this._prefetchDataOrNot(data);
    }
    /**
     * Redefinition of 'makeLinkOrNot' method of fk_multi_autocomplete guiField.
     */
    makeLinkOrNot(data) {
        return this._prefetchDataOrNot(data);
    }
};

/**
 * Playbook autocomplete guiField class.
 */
guiFields.playbook_autocomplete = class PlaybookAutocompleteField extends guiFields.fk_autocomplete {
    /**
     * Method, that defines - make prefetch or not.
     * @param {object} data Instance data.
     * @return {boolean}
     * @private
     */
    _prefetchDataOrNot(data) { /* jshint unused: false */
        return false;
    }
    /**
     * Redefinition of 'prefetchDataOrNot' method of fk_multi_autocomplete guiField.
     */
    prefetchDataOrNot(data) {
        return this._prefetchDataOrNot(data);
    }
    /**
     * Redefinition of 'makeLinkOrNot' method of fk_multi_autocomplete guiField.
     */
    makeLinkOrNot(data) {
        return this._prefetchDataOrNot(data);
    }
};

/**
 * Module autocomplete guiField class.
 */
guiFields.module_autocomplete = class ModuleAutocompleteField extends guiFields.playbook_autocomplete {};

/**
 * Group autocomplete guiField class.
 */
guiFields.group_autocomplete = class GroupAutocompleteField extends guiFields.playbook_autocomplete {};

/**
 * Mixin for classes of fields, that depended on project field value.
 * These fields should format queryset urls containing project id.
 * Project id can be either in instance's data or in route's url params.
 */
const field_depended_on_project_mixin = (Class_name) => class extends Class_name {
    /**
     * Redefinition of 'formatQuerySetUrl' method of fk guiField.
     */
    formatQuerySetUrl(url="", data={}, params={}) { /* jshint unused: false */
        if(url.indexOf('{') == -1) {
            return url;
        }

        let project = data.project || app.application.$route.params[path_pk_key];

        if(project && typeof project == 'object' && project.value) {
            project = project.value;
        }

        return url.format({[path_pk_key]: project});
    }
};

/**
 * History Mode guiField class.
 */
guiFields.history_mode = class HistoryModeField extends field_depended_on_project_mixin(guiFields.fk) {
    /**
     * Redefinition of 'getPrefetchValue' method of fk guiField.
     */
    getPrefetchValue(data={}, prefetch_data={}) {
        return {
            value: prefetch_data[this.options.additionalProperties.value_field],
            prefetch_value: data[this.options.name],
        };
    }
    /**
     * Method returns string with value of instance's 'mode' field (playbook or module).
     * @param data {object} Object with instance data.
     * @return {string}
     */
    getMode(data={}) {
        return data.kind.toLowerCase();
    }
    /**
     * Method returns true, is instance's 'mode' field value equals to 'playbook', otherwise, returns false.
     * @param data {object} Object with instance data.
     * @return {boolean}
     */
    isPlaybookMode(data={}) {
        return this.getMode(data) === 'playbook';
    }
    /**
     * Redefinition of 'getPrefetchFilterName' method of fk guiField.
     */
    getPrefetchFilterName(data={}) {
        return this.isPlaybookMode(data) ? 'pb_filter' : 'name';
    }
    /**
     * Redefinition of 'isPrefetchDataForMe' method of fk guiField.
     */
    isPrefetchDataForMe(data={}, prefetch_data={}) {
        let field_name = this.isPlaybookMode(data) ? 'playbook' : 'name';

        return data[this.options.name] == prefetch_data[field_name];
    }
    /**
     * Redefinition of 'getAppropriateQuerySet' method of fk guiField.
     */
    getAppropriateQuerySet(data={}, querysets=null) {
        let qs = querysets || this.options.additionalProperties.querysets;

        return qs.filter(item => item.url.indexOf(this.getMode(data)) !== -1)[0];
    }
};

/**
 * One History Mode guiField class.
 */
guiFields.one_history_mode = class OneHistoryModeField extends guiFields.history_mode {
    static get mixins() {
        return super.mixins.concat(gui_fields_mixins.one_history_string, gui_fields_mixins.one_history_fk);
    }
};

/**
 * History Initiator guiField class.
 */
guiFields.history_initiator = class HistoryInitiatorField extends field_depended_on_project_mixin(guiFields.fk) {
    static get initiatorTypes() {
        return history_initiator_types; /* globals history_initiator_types */
    }
    /**
     * Redefinition of 'getAppropriateQuerySet' method of fk guiField.
     */
    getAppropriateQuerySet(data={}, querysets=null) {
        let qs = querysets;

        if(!qs) {
            qs = this.options.additionalProperties.querysets;
        }

        let dict = this.constructor.initiatorTypes;

        let selected = qs[0];

        let path = dict[data.initiator_type];

        if(!path) {
            return selected;
        }

        for(let index = 0; index < qs.length; index++) {
            let item = qs[index];

            let p1 = item.url.replace(/^\/|\/$/g, "").split("/");
            let p2 = path.replace(/^\/|\/$/g, "").split("/");

            if(p1.last == p2.last) {
                selected = item;
            }
        }

        return selected;
    }
};

/**
 * OneHistory Initiator guiField class.
 */
guiFields.one_history_initiator = class OneHistoryInitiatorField extends guiFields.history_initiator {
    static get mixins() {
        return super.mixins.concat(gui_fields_mixins.one_history_string, gui_fields_mixins.one_history_initiator);
    }
};

/**
 * History Executor guiField class.
 */
guiFields.history_executor = class HistoryExecutorField extends guiFields.fk {
    /**
     * Redefinition of 'makeLinkOrNot' method of fk guiField.
     * @param {object} data
     */
    makeLinkOrNot(data={}) {
        if(data.initiator_type == 'scheduler') {
            return false;
        }

        return true;
    }
    /**
     * Redefinition of 'prefetchDataOrNot' method of fk guiField.
     * @param {object} data
     */
    prefetchDataOrNot(data={}) {
        if(data.initiator_type == 'scheduler') {
            return false;
        }

        return true;
    }
    /**
     * Redefinition of 'toRepresent' method of fk guiField.
     * @param {object} data
     */
    toRepresent(data={}) {
        if(data.initiator_type == 'scheduler') {
            return 'system';
        }

        let value = data[this.options.name];


        if(value && typeof value == "object") {
            return value.prefetch_value;
        }

        return value;
    }

    static get mixins() {
        return super.mixins.concat(gui_fields_mixins.history_executor);
    }
};

/**
 * OneHistory Executor guiField class.
 */
guiFields.one_history_executor = class OneHistoryExecutorField extends guiFields.history_executor {
    static get mixins() {
        return super.mixins.concat(gui_fields_mixins.one_history_string, gui_fields_mixins.one_history_executor);
    }
};

/**
 * Ansible json guiField class.
 */
guiFields.ansible_json = class AnsibleJsonField extends guiFields.base {
    /**
     * Redefinition of base guiField static property 'mixins'.
     */
    static get mixins() {
        return super.mixins.concat(gui_fields_mixins.ansible_json);
    }
};

/**
 * FK field class, that always shows only 'field_content_readonly' component - value string (with link).
 * This field does not show label, description and other components.
 * This field is supposed to be used in views for OneHistory model.
 */
guiFields.fk_just_value = class FkJustValueField extends guiFields.fk {
    static get mixins() {
        return super.mixins.concat(gui_fields_mixins.fk_just_value);
    }
};

/**
 * History String guiField class.
 * String field for views for OneHistory model.
 */
guiFields.one_history_string = class OneHistoryStringField extends guiFields.string {
    static get mixins() {
        return super.mixins.concat(gui_fields_mixins.one_history_string);
    }
};

/**
 * History FK guiField class.
 * FK field for views for OneHistory model.
 */
guiFields.one_history_fk = class OneHistoryFkField extends guiFields.fk {
    static get mixins() {
        return super.mixins.concat(gui_fields_mixins.one_history_string, gui_fields_mixins.one_history_fk);
    }
};

/**
 * History DATE_TIME guiField class.
 * DATE_TIME field for views for OneHistory model.
 */
guiFields.one_history_date_time = class OneHistoryDateTime extends guiFields.date_time {
    static get mixins(){
        return super.mixins.concat(gui_fields_mixins.one_history_string);
    }

    /**
     * Redefinition of 'toRepresent' method of one_history_string guiField.
     */
    toRepresent(data={}) {
        let value = data[this.options.name];

        if(!value) {
            return;
        }

        return moment(moment.tz(value, app.api.getTimeZone())).tz(moment.tz.guess()).format("YYYY-MM-DD HH:mm:ss");
    }

};

/**
 * History UPTIME guiField class.
 * UPTIME field for views for OneHistory model.
 */
guiFields.one_history_uptime = class OneHistoryUpTime extends guiFields.uptime {
    static get mixins(){
        return super.mixins.concat(gui_fields_mixins.one_history_string);
    }
};

/**
 * History ONE_HISTORY_REVISION guiField class.
 * ONE_HISTORY_REVISION field for views for OneHistory model.
 */
guiFields.one_history_revision = class OneHistoryRevision extends guiFields.one_history_string {
    /**
     * Redefinition of 'toRepresent' method of one_history_string guiField.
     */
    toRepresent(data={}) {
        let value = data[this.options.name];

        if(value) {
            return value.substr(0, 8);
        }
    }
};

/**
 * History ONE_HISTORY_CHOICES guiField class.
 * ONE_HISTORY_CHOICES field for views for OneHistory model.
 */
guiFields.one_history_choices = class OneHistoryChoices extends guiFields.choices {
    static get mixins(){
        return super.mixins.concat(gui_fields_mixins.one_history_string, gui_fields_mixins.one_history_choices);
    }
};

/**
 * History ONE_HISTORY_RAW_INVENTORY guiField class.
 * ONE_HISTORY_RAW_INVENTORY field for views for OneHistory model.
 */
guiFields.one_history_raw_inventory = class OneHistoryRawInventoryField extends guiFields.plain_text {
    static get mixins() {
        return super.mixins.concat(gui_fields_mixins.one_history_raw_inventory);
    }
};

/**
 * History ONE_HISTORY_BOOLEAN guiField class.
 * ONE_HISTORY_BOOLEAN field for views for OneHistory model.
 */
guiFields.one_history_boolean = class OneHistoryBooleanField extends guiFields.boolean {
    static get mixins() {
        return super.mixins.concat(gui_fields_mixins.one_history_string, gui_fields_mixins.one_history_boolean);
    }
};

/**
 * History ONE_HISTORY_EXECUTE_ARGS guiField class.
 * ONE_HISTORY_EXECUTE_ARGS field for views for OneHistory model.
 */
guiFields.one_history_execute_args = class OneHistoryExecuteArgsField extends guiFields.json {
    static get mixins() {
        return super.mixins.concat(gui_fields_mixins.one_history_execute_args);
    }
    /**
     * Method, that inits all real fields of json field.
     */
    generateRealFields(value={}) {
        let realFields = {};

        for(let field in value) {
            if(value.hasOwnProperty(field)) {
                let opt = {
                    name: field,
                    readOnly: this.options.readOnly || false,
                    title: field,
                    format: 'one_history_string',
                };


                if (typeof value[field] == 'boolean') {
                    opt.format = 'one_history_boolean';
                }

                realFields[field] = new guiFields[opt.format](opt);
            }
        }

        return realFields;
    }
};
