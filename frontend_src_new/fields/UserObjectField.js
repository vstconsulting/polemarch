export const UserObjectFieldReadonlyMixin = {
    mixins: [spa.fields.base.BaseFieldContentReadonlyMixin],
    render(h) {
        if (this.value?.id) {
            return h('router-link', { props: { to: `/user/${this.value.id}` } }, this.value.username);
        }
        return h('span');
    },
};
export const UserObjectFieldMixin = {
    mixins: [spa.fields.base.BaseFieldMixin],
    components: {
        field_content_readonly: UserObjectFieldReadonlyMixin,
        field_content_edit: UserObjectFieldReadonlyMixin,
        field_list_view: UserObjectFieldReadonlyMixin,
    },
};

export class UserObjectField extends spa.fields.base.BaseField {
    static format = 'user-object';
    constructor(options) {
        super(options);
        this.readOnly = true;
    }
    static get mixins() {
        return [UserObjectFieldMixin];
    }
}

spa.signals.once('APP_CREATED', (app) => {
    app.fieldsResolver.registerField('string', UserObjectField.format, UserObjectField);
});
