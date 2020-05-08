import Logo from './Logo.vue';
spa.globalComponentsRegistrator.add(Logo);

import './customizer.js';
import './common.js';
import './fields';
import * as hosts from './hosts.js';
import './inventories';
import './projects';
import * as history from './history';
import * as projects from './projects.js';
import * as tasks from './tasks.js';
import * as users from './users.js';
import * as dashboard from './dashboard';

export { hosts, history, projects, tasks, users, dashboard };

import './polemarch-gui.css';
