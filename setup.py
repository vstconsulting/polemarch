import os
import sys

try:
    from sphinx.setup_command import BuildDoc
    import sphinx
    has_sphinx = True
except ImportError:
    has_sphinx = False

from setuptools import find_packages, setup
from setuptools.command.install import install
from setuptools.command.build_ext import build_ext as _build_ext
from setuptools.command.sdist import sdist as _sdist
from setuptools.extension import Extension

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

ext_list = [
    "polemarch.api.v1.filters",
    "polemarch.api.v1.serializers",
    "polemarch.api.v1.views",
    "polemarch.api.base",
    "polemarch.api.handlers",
    "polemarch.api.permissions",
    "polemarch.api.routers",
    "polemarch.api.urls",
    "polemarch.main.models.base",
    "polemarch.main.models.hosts",
    "polemarch.main.models.projects",
    "polemarch.main.models.tasks",
    "polemarch.main.models.utils",
    "polemarch.main.models.users",
    "polemarch.main.models.vars",
    "polemarch.main.tasks.tasks",
    'polemarch.main.settings',
    'polemarch.main.repo._base',
    'polemarch.main.repo.manual',
    'polemarch.main.repo.tar',
    'polemarch.main.repo.vcs',
    'polemarch.main.validators',
    'polemarch.main.views',
    'polemarch.main.context_processors',

]

if not os.path.exists(ext_list[0].replace(".", "/")+ext):
    ext = ".py" if ext == ".c" else ".c"

extensions_dict = dict((
    (exten, [exten.replace(".", "/")+ext]) for exten in ext_list
))

if 'develop' in sys.argv:
    ext_modules = []
else:
    ext_modules = list(Extension(m, f) for m, f in extensions_dict.items())

    if use_cython and has_cython:
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

    def run(self):
        return _sdist.run(self)


cmdclass = {
    'install': PostInstallCommand,
    'compile': Compile,
    'build_ext': _build_ext
}

if has_sphinx:
    cmdclass['build_sphinx'] = BuildDoc

setup(
    name='polemarch',
    packages=find_packages(),
    ext_modules=ext_modules,
    include_package_data=True,
    scripts=['polemarchctl'],
    install_requires=[
        "django>=1.11,<2.0",
    ] + REQUIRES,
    dependency_links=[
    ] + REQUIRES_git,
    cmdclass=cmdclass,
)
