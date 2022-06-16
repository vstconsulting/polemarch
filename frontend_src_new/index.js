import './style.scss';
import './layout';
import * as inventory from './inventory';
import './project';
import './history';
import './templates';

export { inventory };

import Home from './Home.vue';
import { UserObjectField } from './fields/UserObjectField';
spa.router.mixins.customRoutesComponentsTemplates.home = Home;

spa.signals.once('APP_CREATED', (app) => {
    const ownerField = {
        type: 'string',
        format: UserObjectField.format,
    };

    const definitions = app.schema.definitions;
    for (const modelName in definitions) {
        if (definitions[modelName].properties?.owner?.$ref) {
            definitions[modelName].properties.owner = ownerField;
        }
    }
});
