# Compilation block
########################################################################################
import re
import os
import sys
import subprocess
import fnmatch
import codecs
import gzip
import shutil

# allow setup.py to be run from any path
os.chdir(os.path.normpath(os.path.join(os.path.abspath(__file__), os.pardir)))

from setuptools import find_packages, setup, errors, Command
from setuptools.extension import Extension
from setuptools.command.sdist import sdist as _sdist
from setuptools.command.build_py import build_py as build_py_orig
from setuptools.command.install_lib import install_lib as _install_lib
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


ignored_keys = ['-h', '--help', '--version']
is_help = any([a for a in ignored_keys if a in sys.argv])
is_develop = 'develop' in sys.argv
is_build = (any([a for a in ['compile', 'bdist_wheel', 'bdist'] if a in sys.argv]) or is_develop) and not is_help


def get_discription(file_path='README.rst', folder=os.getcwd()):
    with codecs.open("{}/{}".format(folder, file_path), 'r', encoding='utf-8') as readme:
        return readme.read()


def load_requirements(file_name, folder=os.getcwd()):
    with codecs.open(os.path.join(folder, file_name), 'r', encoding='utf-8')as req_file:
        return req_file.read().strip().split('\n')


def get_file_ext(ext):
    file_types = [".py", ".pyx", ".c", '.cpp'] if has_cython else [".c", '.cpp', ".py"]
    for ftype in file_types:
        fname = ext.replace(".", "/") + ftype
        if os.path.exists(fname):
            return fname
    return None


def listfiles(folder):
    if not isinstance(folder, (list, tuple)):
        folder = [folder]
    folder = filter(lambda p: os.path.isdir(p), folder)
    for one_folder in folder:
        for root, folders, files in os.walk(one_folder):
            for filename in folders + files:
                yield os.path.join(root, filename)


def clear_old_extentions(extensions_list, packages):
    for filename in listfiles(packages):
        _filename, _f_ext = os.path.splitext(filename)
        if os.path.isdir(_filename) or _f_ext not in ['.c', '.cpp']:
            continue
        has_py = (
            os.path.exists('{}.py'.format(_filename)) or
            os.path.exists('{}.pyx'.format(_filename))
        )

        if has_py and filename.replace('/', '.').replace(_f_ext, '') in extensions_list:
            print('Removing old extention [{}].'.format(filename))
            os.remove(filename)


def make_extention(module_name, files, extra_compile_args, main_include_dir=os.path.join(os.getcwd(), 'include')):
    include_dirs = list(filter(
        lambda f: bool(f) and os.path.exists(f) and os.path.isdir(f),
        [os.path.join(module_name.split('.')[0], 'include'), main_include_dir]
    ))

    return Extension(
        module_name, files,
        extra_compile_args=extra_compile_args,
        include_dirs=include_dirs
    )


def make_extensions(extensions_list, packages):
    if not isinstance(extensions_list, list):
        raise Exception("Extension list should be `list`.")

    if not is_help:
        clear_old_extentions(extensions_list, packages)

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

    extra_compile_args = [
        '-g0', '-ggdb1',
        "-fno-strict-aliasing",
        "-fno-var-tracking-assignments",
        "-pipe", "-std=c99", '-Werror=sign-compare'
    ]
    ext_modules = list(
        make_extention(m, f, extra_compile_args)
        for m, f in extensions_dict.items()
    )
    ext_count = len(ext_modules)
    nthreads = ext_count if ext_count < 10 else 10

    language_level = 3
    if is_help:
        pass
    elif has_cython and ('compile' in sys.argv or 'bdist_wheel' in sys.argv or 'build_ext' in sys.argv):
        cy_kwargs = dict(
            nthreads=nthreads,
            force=True,
            language_level=language_level,
            compiler_directives=dict(
                linetrace='CYTHON_TRACE_NOGIL' in sys.argv,
                profile=True,
                c_string_type='str',
                c_string_encoding='utf8'
            ),
        )
        return cythonize(ext_modules, **cy_kwargs), extensions_dict
    return ext_modules, extensions_dict


def minify_js_file(js_file, jsmin_func):
    return jsmin_func(js_file, quote_chars="'\"`")


def minify_css_file(css_file, cssmin_func):
    return cssmin_func(css_file)


def minify_static_files(base_dir, files, exclude=None):
    exclude = exclude or []
    patterns = dict()
    try:
        from jsmin import jsmin as jsmin_func
        patterns['*.js'] = (minify_js_file, jsmin_func)
    except:
        pass
    try:
        from csscompressor import compress as csscompressor_func
        patterns['*.css'] = (minify_css_file, csscompressor_func)
    except:
        pass

    regex_exclude = [re.compile(r, re.MULTILINE) for r in exclude]

    for fnext, funcs in patterns.items():
        for fext_file in filter(lambda f: fnmatch.fnmatch(f, fnext), files):
            if fnmatch.fnmatch(fext_file, '*.min.*'):
                continue
            fext_file = os.path.join(base_dir, fext_file)
            if os.path.exists(fext_file):
                if not any(filter(lambda fp: bool(fp.search(fext_file)), regex_exclude)):
                    func, subfunc = funcs
                    with codecs.open(fext_file, 'r', encoding='utf-8') as static_file_fd:
                        minified = func(static_file_fd.read(), subfunc)
                    with codecs.open(fext_file, 'w', encoding='utf-8') as static_file_fd:
                        static_file_fd.write(minified)
                    print('Minfied file {fext_file}.'.format(fext_file=fext_file))
                with open(fext_file, 'rb') as f_in:
                    with gzip.open("{}.gz".format(fext_file), 'wb') as f_out:
                        shutil.copyfileobj(f_in, f_out)
                print('Compressed file {fext_file}.'.format(fext_file=fext_file))


def compile_py_func(fullname, compile_file_func):
    if compile_file_func(fullname, ddir=os.path.dirname(fullname), legacy=True, optimize=0):
        os.remove(fullname)


def compile_python_sources(base_dir, files, exclude=None):
    exclude = exclude or []
    patterns = dict()
    try:
        from compileall import compile_file
        patterns['*.py'] = (compile_py_func, compile_file)
    except:
        pass

    regex_exclude = [re.compile(r, re.MULTILINE) for r in exclude]

    for fnext, funcs in patterns.items():
        for fext_file in filter(lambda f: fnmatch.fnmatch(f, fnext), files):
            fext_file = os.path.join(base_dir, fext_file)
            if os.path.exists(fext_file):
                if not any(filter(lambda fp: bool(fp.search(fext_file)), regex_exclude)):
                    func, subfunc = funcs
                    funcs[0](fext_file, funcs[1])
                    print('Compiled {fext_file}.'.format(fext_file=fext_file))


class _Compile(_sdist):
    extensions_dict = dict()
    static_exclude = []

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
        minify_static_files(base_dir, files, self.static_exclude)

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
            assets = self.assets.format(release=self.release)
            assets = list(filter(bool, assets.split('\n')))
            self._gh_kwargs['asset_pattern'] = assets
        if self.body:
            self._gh_kwargs['body'] = self.body

    def run(self):
        from github_release import gh_release_create
        gh_release_create(*self._gh_args, **self._gh_kwargs)


class build_py(build_py_orig):
    exclude = []
    compile_extentions_types = ['.py', '.pyx']
    wheel_extentions_types = ['.c', '.cpp'] + compile_extentions_types

    def _filter_modules(self, module_tuple):
        pkg, mod, file = module_tuple
        try:
            file_name, file_ext = os.path.splitext(file)
            module_name = file_name.replace('/', '.')
        except:
            return True
        if 'bdist_wheel' in sys.argv:
            exclude_list = self.wheel_extentions_types
        elif 'compile' in sys.argv:
            exclude_list = self.compile_extentions_types
        else:
            return True
        if module_name in self.exclude and file_ext in exclude_list:
            return False
        return True

    def find_package_modules(self, package, package_dir):
        modules = build_py_orig.find_package_modules(self, package, package_dir)
        return list(filter(self._filter_modules, modules))


class install_lib(_install_lib):
    exclude = []
    static_exclude = []
    compile_exclude = []

    def _filter_files_with_ext(self, filename):
        _filename, _fext = os.path.splitext(filename)
        if _fext in build_py.wheel_extentions_types:
            return True
        return False

    def install(self):
        result = _install_lib.install(self)
        files = list(listfiles(self.install_dir))
        so_extentions = list(filter(lambda f: fnmatch.fnmatch(f, '*.so'), files))
        for source in filter(self._filter_files_with_ext, files):
            _source_name, _source_ext = os.path.splitext(source)
            if any(filter(lambda f: fnmatch.fnmatch(f, _source_name+"*.so"), so_extentions)):
                print('Removing extention sources [{}].'.format(source))
                os.remove(source)
        minify_static_files('', files, self.static_exclude)
        if os.getenv('BUILD_COMPILE', '') == 'true':
            compile_python_sources('', files, self.compile_exclude)
        return result


def get_compile_command(extensions_dict=None):
    extensions_dict = extensions_dict or dict()
    compile_class = _Compile
    compile_class.extensions_dict = extensions_dict
    return compile_class


def make_setup(**opts):
    if 'packages' not in opts:
        opts['packages'] = find_packages()
    ext_modules_list = opts.pop('ext_modules_list', [])
    ext_mod, ext_mod_dict = make_extensions(ext_modules_list, opts['packages'])
    opts['ext_modules'] = opts.get('ext_modules', []) + ext_mod
    cmdclass = opts.get('cmdclass', dict())
    static_exclude = opts.pop('static_exclude_min', [])
    if 'compile' not in cmdclass:
        compile_class = get_compile_command(ext_mod_dict)
        compile_class.static_exclude = static_exclude
        cmdclass.update({"compile": get_compile_command(ext_mod_dict)})
    if has_cython:
        build_py.exclude = ext_modules_list
        install_lib.static_exclude = static_exclude
        install_lib.compile_exclude = opts.pop('compile_modules_exclude', [])
        cmdclass.update({
            'build_ext': _build_ext,
            'build_py': build_py,
            'install_lib': install_lib
        })
    if has_sphinx and 'build_sphinx' not in cmdclass:
        cmdclass['build_sphinx'] = BuildDoc
    cmdclass['githubrelease'] = GithubRelease
    opts['cmdclass'] = cmdclass

    webpack_path = os.path.join(os.getcwd(), 'webpack.config.js')
    if os.path.exists(webpack_path) and is_build and os.environ.get('DONT_YARN', "") != 'true':
        try:
            subprocess.check_call(['yarn', 'install', '--pure-lockfile'], stdout=sys.stdout, stderr=sys.stderr)
            subprocess.check_call(['yarn', 'devBuild' if is_develop else 'build'], stdout=sys.stdout, stderr=sys.stderr)
        except Exception as err:
            raise errors.CompileError(str(err))

    setup(**opts)

########################################################################################
# end block

ext_list = []

if 'develop' in sys.argv:
    ext_list = []

install_requirements = load_requirements('requirements.txt', os.getcwd())

kwargs = dict(
    name='polemarch',
    packages=find_packages(),
    ext_modules_list=ext_list,
    static_exclude_min=[
        'polemarch/templates/gui/service-worker.js',
    ],
    install_requires=[
    ] + install_requirements,
    extras_require={
        'test': load_requirements('requirements-test.txt', os.getcwd()) + [
            i.replace('prod', 'test,prod')
            for i in install_requirements
            if isinstance(i, str) and 'vstutils' in i
        ],
        'mysql': ['mysqlclient'],
        'postgresql': ['psycopg2'],
    },
    dependency_links=[
    ] + load_requirements('requirements-git.txt', os.getcwd()),
    project_urls={
        "Issue Tracker": "https://gitlab.com/vstconsulting/polemarch/issues",
        "Documentation": "https://about.polemarch.org/",
        "Web site": "https://polemarch.org/",
        "Source Code": "https://gitlab.com/vstconsulting/polemarch",
        "Releases": "https://github.com/vstconsulting/polemarch/releases",
        "Docker": "https://hub.docker.com/r/vstconsulting/polemarch/",
    },
    entry_points={
        'console_scripts': ['polemarchctl=polemarch:cmd_execution']
    },
)

if __name__ == '__main__':
    make_setup(**kwargs)
