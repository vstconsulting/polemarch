import os
import sys
from vstutils.compile import make_setup, load_requirements

# allow setup.py to be run from any path
os.chdir(os.path.normpath(os.path.join(os.path.abspath(__file__), os.pardir)))

REQUIRES = load_requirements('requirements.txt', os.getcwd())
REQUIRES += load_requirements('requirements-doc.txt', os.getcwd())
REQUIRES_git = load_requirements('requirements-git.txt', os.getcwd())

ext_list = [
    "polemarch.api.v1.filters",
    "polemarch.api.v1.serializers",
    "polemarch.api.v1.views",
    "polemarch.api.base",
    "polemarch.api.handlers",
    "polemarch.api.permissions",
    "polemarch.api.routers",
    "polemarch.api.signals",
    "polemarch.api.urls",
    "polemarch.main.models.base",
    "polemarch.main.models.hosts",
    "polemarch.main.models.hooks",
    "polemarch.main.models.projects",
    "polemarch.main.models.tasks",
    "polemarch.main.models.utils",
    "polemarch.main.models.users",
    "polemarch.main.models.vars",
    'polemarch.main.settings',
    'polemarch.main.hooks.base',
    'polemarch.main.hooks.http',
    'polemarch.main.hooks.script',
    'polemarch.main.repo._base',
    'polemarch.main.repo.manual',
    'polemarch.main.repo.tar',
    'polemarch.main.repo.vcs',
    'polemarch.main.validators',
    'polemarch.main.views',
    'polemarch.main.context_processors',

]

if 'develop' in sys.argv:
    ext_modules = []
    ext_list = []

make_setup(
    name='polemarch',
    ext_modules_list=ext_list,
    scripts=['polemarchctl'],
    install_requires=[
        # "django>=1.11,<=2.0",
    ] + REQUIRES,
    dependency_links=[
    ] + REQUIRES_git,
)
