import './style.scss';
import { hideListColumns } from '../history';

const modelListFields = ['mode', 'inventory', 'template', 'template_opt'];

hideListColumns('Periodictask', modelListFields);
