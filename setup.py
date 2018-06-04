import os
import sys

# allow setup.py to be run from any path
os.chdir(os.path.normpath(os.path.join(os.path.abspath(__file__), os.pardir)))

try:
    from vstcompile import load_requirements, make_setup, find_packages
    has_vstcompile = True
except ImportError:
    has_vstcompile = False
    from setuptools import setup as make_setup, find_packages

    def load_requirements(file_name, folder=os.getcwd()):
        with open(os.path.join(folder, file_name)) as req_file:
            return req_file.read().strip().split('\n')


ext_list = [
    "polemarch.api.v1.filters",
    "polemarch.api.v1.serializers",
    "polemarch.api.v1.views",
    "polemarch.api.base",
    "polemarch.api.handlers",
    "polemarch.api.permissions",
    "polemarch.api.signals",
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

]

if 'develop' in sys.argv:
    ext_list = []

kwargs = dict(
    name='polemarch',
    include_package_data=True,
    install_requires=[
        'vstcompile[doc]',
    ] +
    load_requirements('requirements.txt', os.getcwd()) +
    load_requirements('requirements-doc.txt', os.getcwd()),
    extras_require={
        'test': load_requirements('requirements-test.txt', os.getcwd()),
    },
    dependency_links=[
    ] + load_requirements('requirements-git.txt', os.getcwd()),
    project_urls={
        "Issue Tracker": "https://gitlab.com/vstconsulting/polemarch/issues",
        "Documentation": "http://polemarch.readthedocs.io/",
        "Source Code": "https://gitlab.com/vstconsulting/polemarch",
        "Releases": "https://github.com/vstconsulting/polemarch/releases",
    },
    entry_points={
        'console_scripts': ['polemarchctl=polemarch:cmd_execution']
    },
)

if has_vstcompile:
    kwargs['ext_modules_list'] = ext_list

make_setup(**kwargs)
