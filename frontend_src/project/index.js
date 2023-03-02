import { setupProjectDetailView } from './detail';
import './style.scss';

function setupCiTemplateField() {
    spa.signals.once('models[ProjectVariable].fields.beforeInit', (fields) => {
        fields.value['x-options'].types.ci_template['x-options'].linkGenerator = ({ value }) => {
            return spa.utils.formatPath(
                '/project/{id}/execution_templates/{execution_templates_id}/options/{options_id}/',
                {
                    id: app.router.currentRoute.params.id,
                    execution_templates_id: value?.template,
                    options_id: value?.id,
                },
            );
        };
    });
}

setupCiTemplateField();
setupProjectDetailView();
