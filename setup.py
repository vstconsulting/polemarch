# Compilation block
########################################################################################
import os
import sys

# allow setup.py to be run from any path
os.chdir(os.path.normpath(os.path.join(os.path.abspath(__file__), os.pardir)))

from setuptools import find_packages, setup, Command
from setuptools.extension import Extension
from setuptools.command.sdist import sdist as _sdist
try:
    from Cython.Build import cythonize, build_ext as _build_ext
except ImportError:
    has_cython = False
else:
    has_cython = True

try:
    from sphinx.setup_command import BuildDoc
    import sphinx  # noqa: F401
    has_sphinx = True
except ImportError:
    has_sphinx = False


def get_discription(file_path='README.rst', folder=os.getcwd()):
    with open("{}/{}".format(folder, file_path)) as readme:
        return readme.read()


def load_requirements(file_name, folder=os.getcwd()):
    with open(os.path.join(folder, file_name)) as req_file:
        return req_file.read().strip().split('\n')


def get_file_ext(ext):
    file_types = [".py", ".pyx", ".c"] if has_cython else [".c", ".py"]
    for ftype in file_types:
        fname = ext.replace(".", "/") + ftype
        if os.path.exists(fname):
            return fname
    return None


def make_extensions(extensions_list):
    if not isinstance(extensions_list, list):
        raise Exception("Extension list should be `list`.")

    extensions_dict = {}
    for ext in extensions_list:
        files = []
        module_name = ext
        if isinstance(ext, (list, tuple)):
            module_name = ext[0]
            for file_module in ext[1]:
                file_name = get_file_ext(file_module)
                files += [file_name] if file_name else []
        else:
            file_name = get_file_ext(ext)
            files += [file_name] if file_name else []
        if files:
            extensions_dict[module_name] = files

    ext_modules = list(Extension(m, f) for m, f in extensions_dict.items())
    ext_count = len(ext_modules)
    nthreads = ext_count if ext_count < 10 else 10

    if has_cython and 'compile' in sys.argv:
        return cythonize(ext_modules, nthreads=nthreads, force=True), extensions_dict
    return ext_modules, extensions_dict


class _Compile(_sdist):
    extensions_dict = dict()

    def __filter_files(self, files):
        for _files in self.extensions_dict.values():
            for file in _files:
                if file in files:
                    files.remove(file)
        return files

    def make_release_tree(self, base_dir, files):
        if has_cython:
            files = self.__filter_files(files)
        _sdist.make_release_tree(self, base_dir, files)

    def run(self):
        return _sdist.run(self)


class GithubRelease(Command):
    '''
    Make release on github via githubrelease
    '''
    description = 'Make release on github via githubrelease'

    user_options = [
        ('body=', 'b', 'Body message.'),
        ('assets=', 'a', 'Release assets patterns.'),
        ('repo=', 'r', 'Repository for release.'),
        ('release=', 'R', 'Release version.'),
        ('dry-run=', 'd', 'Dry run.'),
        ('publish=', 'p', 'Publish release or just create draft.'),
    ]

    def initialize_options(self):
        self.body = None or os.getenv('CI_COMMIT_DESCRIPTION', None)
        self.assets = None
        self.repo = None
        self.dry_run = False
        self.publish = False
        self.release = None or self.distribution.metadata.version

    def finalize_options(self):
        if self.repo is None:
            raise Exception("Parameter --repo is missing")
        if self.release is None:
            raise Exception("Parameter --release is missing")
        self._gh_args = (self.repo, self.release)
        self._gh_kwargs = dict(
            publish=self.publish, name=self.release, dry_run=self.dry_run
        )
        if self.assets:
            self._gh_kwargs['asset_pattern'] = self.assets.format(release=self.release)
        if self.body:
            self._gh_kwargs['body'] = self.body

    def run(self):
        from github_release import gh_release_create
        gh_release_create(*self._gh_args, **self._gh_kwargs)


def get_compile_command(extensions_dict=None):
    extensions_dict = extensions_dict or dict()
    compile_class = _Compile
    compile_class.extensions_dict = extensions_dict
    return compile_class


def make_setup(**opts):
    if 'packages' not in opts:
        opts['packages'] = find_packages()
    ext_mod, ext_mod_dict = make_extensions(opts.pop('ext_modules_list', list()))
    opts['ext_modules'] = opts.get('ext_modules', list()) + ext_mod
    cmdclass = opts.get('cmdclass', dict())
    if 'compile' not in cmdclass:
        cmdclass.update({"compile": get_compile_command(ext_mod_dict)})
    if has_cython:
        cmdclass.update({'build_ext': _build_ext})
    if has_sphinx and 'build_sphinx' not in cmdclass:
        cmdclass['build_sphinx'] = BuildDoc
    cmdclass['githubrelease'] = GithubRelease
    opts['cmdclass'] = cmdclass
    setup(**opts)

########################################################################################
# end block


ext_list = [
    "polemarch.api.v2.filters",
    "polemarch.api.v2.permissions",
    "polemarch.api.v2.serializers",
    "polemarch.api.v2.swagger",
    "polemarch.api.v2.views",
    "polemarch.api.signals",
    "polemarch.main.models.base",
    "polemarch.main.models.hooks",
    "polemarch.main.models.hosts",
    "polemarch.main.models.projects",
    "polemarch.main.models.tasks",
    "polemarch.main.models.users",
    "polemarch.main.models.utils",
    "polemarch.main.models.vars",
    "polemarch.main.templatetags.inventories",
    'polemarch.main.settings',
    'polemarch.main.hooks.base',
    'polemarch.main.hooks.http',
    'polemarch.main.hooks.script',
    'polemarch.main.repo._base',
    'polemarch.main.repo.manual',
    'polemarch.main.repo.tar',
    'polemarch.main.repo.vcs',
    'polemarch.main.validators',
]

if 'develop' in sys.argv:
    ext_list = []

kwargs = dict(
    name='polemarch',
    ext_modules_list=ext_list,
    include_package_data=True,
    python_requires=">=2.7, !=3.0.*, !=3.1.*, !=3.2.*, !=3.3.*, !=3.4.*",
    install_requires=[
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
        "Docker": "https://hub.docker.com/r/vstconsulting/polemarch/",
    },
    entry_points={
        'console_scripts': ['polemarchctl=polemarch:cmd_execution']
    },
)

make_setup(**kwargs)
