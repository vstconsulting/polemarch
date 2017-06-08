import os

from setuptools import find_packages, setup
from setuptools.command.install import install

import polemarch

# allow setup.py to be run from any path
os.chdir(os.path.normpath(os.path.join(os.path.abspath(__file__), os.pardir)))

RMF = os.path.join(os.path.dirname(__file__), 'polemarch/README.md')
with open(RMF) as readme:
    README = readme.read()

RQF = os.path.join(os.path.dirname(__file__), 'requirements.txt')
with open(RQF) as req:
    REQUIRES = req.read().strip().split('\n')

RQF_git = os.path.join(os.path.dirname(__file__), 'requirements-git.txt')
with open(RQF) as req:
    REQUIRES_git = req.read().strip().split('\n')


class PostInstallCommand(install):
    """Post-installation for installation mode."""
    def run(self):
        install.run(self)
        # Does not migrate on pip installation

setup(
    name='polemarch',
    version=polemarch.__version__,
    packages=find_packages(),
    include_package_data=True,
    license='MIT',
    description='Polemarch is ansible based for orcestration infrastructure.',
    long_description=README,
    author='VST Consulting',
    author_email='sergey.k@vstconsulting.net',
    classifiers=[
        'Environment :: Web Environment',
        'Framework :: Django',
        'Framework :: Django :: 1.{8-11}',
        'Operating System :: Centos',
        'Programming Language :: Python',
        'Programming Language :: Python :: 2.7',
        'Programming Language :: Python :: 3.{4-6}',
        'Topic :: Internet :: WWW/HTTP',
        'Topic :: Internet :: WWW/HTTP :: Dynamic Content',
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
    cmdclass={
        'install': PostInstallCommand
    },
)
