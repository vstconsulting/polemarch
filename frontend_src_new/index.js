import './style.scss';
import './layout';
import './inventory';
import './project';
import './history';
import './templates';

import Home from './Home.vue';
spa.router.mixins.customRoutesComponentsTemplates.home.mixins.push(Home);
