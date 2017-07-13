import os
import sys

try:
    from sphinx.setup_command import BuildDoc
    has_sphinx = True
except ImportError:
    has_sphinx = False

from setuptools import find_packages, setup
from setuptools.command.install import install
from setuptools.command.build_ext import build_ext as _build_ext
from setuptools.command.sdist import sdist as _sdist
from setuptools.extension import Extension

import polemarch

try:
    from Cython.Distutils import build_ext as _build_ext
    from Cython.Build import cythonize
except ImportError:
    has_cython = False
else:
    has_cython = True


# allow setup.py to be run from any path
os.chdir(os.path.normpath(os.path.join(os.path.abspath(__file__), os.pardir)))

RMF = os.path.join(os.path.dirname(__file__), 'README.rst')
with open(RMF) as readme:
    README = readme.read()


def load_requirements(file_name):
    with open(os.path.join(os.path.dirname(__file__), file_name)) as req_file:
        return req_file.read().strip().split('\n')


REQUIRES = load_requirements('requirements.txt')
REQUIRES += load_requirements('requirements-doc.txt')
REQUIRES_git = load_requirements('requirements-git.txt')


if 'compile' in sys.argv:
    use_cython = True
    ext = ".py"
else:
    use_cython = False
    ext = '.c'

extensions_dict = dict((
    ("polemarch.api.v1.filters", ["polemarch/api/v1/filters"+ext]),
    ("polemarch.api.v1.serializers", ["polemarch/api/v1/serializers"+ext]),
    ("polemarch.api.v1.views", ["polemarch/api/v1/views"+ext]),
    ("polemarch.api.base", ["polemarch/api/base"+ext]),
    ("polemarch.api.handlers", ["polemarch/api/handlers"+ext]),
    ("polemarch.api.permissions", ["polemarch/api/permissions"+ext]),
    ("polemarch.api.routers", ["polemarch/api/routers"+ext]),
    ("polemarch.api.urls", ["polemarch/api/urls"+ext]),
    ("polemarch.main.models.base", ["polemarch/main/models/base"+ext]),
    ("polemarch.main.models.hosts", ["polemarch/main/models/hosts"+ext]),
    ("polemarch.main.models.projects", ["polemarch/main/models/projects"+ext]),
    ("polemarch.main.models.tasks", ["polemarch/main/models/tasks"+ext]),
    ("polemarch.main.models.users", ["polemarch/main/models/users"+ext]),
    ("polemarch.main.models.vars", ["polemarch/main/models/vars"+ext]),
    ("polemarch.main.tasks.tasks", ["polemarch/main/tasks/tasks"+ext]),
    ('polemarch.main.settings', ["polemarch/main/settings"+ext]),
    ('polemarch.main.repo_backends', ["polemarch/main/repo_backends"+ext]),
    ('polemarch.main.validators', ["polemarch/main/validators"+ext]),
    ('polemarch.main.views', ["polemarch/main/views"+ext]),
    ('polemarch.main.context_processors',
     ["polemarch/main/context_processors"+ext]),
))

ext_modules = list(Extension(m, f) for m, f in extensions_dict.items())

if use_cython:
    ext_modules = cythonize(ext_modules)


class PostInstallCommand(install):
    """Post-installation for installation mode."""
    def run(self):
        install.run(self)


class Compile(_sdist):
    def __filter_files(self, files):
        for _files in extensions_dict.values():
            for file in _files:
                if file in files:
                    files.remove(file)
        return files

    def make_release_tree(self, base_dir, files):
        if use_cython:
            files = self.__filter_files(files)
        _sdist.make_release_tree(self, base_dir, files)


name = 'polemarch'
version = polemarch.__version__
lic = 'AGPLv3+'
description = ('Polemarch is ansible based service for orcestration '
               'infrastructure.')
author = 'VST Consulting'
author_email = 'sergey.k@vstconsulting.net'

cmdclass = {
    'install': PostInstallCommand,
    'compile': Compile,
    'build_ext': _build_ext
}

if has_sphinx:
    cmdclass['build_sphinx'] = BuildDoc

setup(
    name=name,
    version=version,
    packages=find_packages(),
    ext_modules=ext_modules,
    include_package_data=True,
    license=lic,
    description=description,
    long_description=README,
    author=author,
    author_email=author_email,
    url="https://github.com/vstconsulting/polemarch",
    classifiers=[
        'Environment :: Web Environment',
        'Framework :: Django',
        'Framework :: Django :: 1.8',
        'Framework :: Django :: 1.9',
        'Framework :: Django :: 1.10',
        'Framework :: Django :: 1.11',
        'Operating System :: OS Independent',
        'Programming Language :: Cython',
        'Programming Language :: Python',
        'Programming Language :: Python :: 2',
        'Programming Language :: Python :: 2.6',
        'Programming Language :: Python :: 2.7',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.3',
        'Programming Language :: Python :: 3.4',
        'Programming Language :: Python :: 3.5',
        'Programming Language :: Python :: 3.6',
        'Topic :: Internet :: WWW/HTTP',
        'Topic :: Internet :: WWW/HTTP :: Dynamic Content',
        'Topic :: Utilities',
    ],
    scripts=['polemarchctl'],
    install_requires=[
        "django>=1.8,<1.12",
    ] + REQUIRES,
    dependency_links=[
    ] + REQUIRES_git,
    extras_require={
        "apache": [
            "mod_wsgi==4.5.14"
        ]
    },
    cmdclass=cmdclass,
    command_options={
        'build_sphinx': {
            'project': ('setup.py', name),
            'version': ('setup.py', version),
            'release': ('setup.py', version),
        }
    },
)
