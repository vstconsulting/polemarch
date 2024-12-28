import os
import sys
from vstcompile import make_setup, load_requirements

# allow setup.py to be run from any path
os.chdir(os.path.normpath(os.path.join(os.path.abspath(__file__), os.pardir)))
os.environ.setdefault('NOT_COMPRESS', 'true')

ext_list = []

if 'develop' in sys.argv:
    ext_list = []

install_requirements = load_requirements('requirements.txt', os.getcwd())
install_requirements = [
    i.replace('prod', 'prod,ldap') if isinstance(i, str) and i.strip().startswith('vstutils') else i
    for i in install_requirements
]

kwargs = dict(
    name='polemarch',
    ext_modules_list=ext_list,
    install_requires=[
    ] + install_requirements,
    extras_require={
        'test': load_requirements('requirements-test.txt', os.getcwd()) + [
            i.replace('prod', 'test,prod')
            for i in install_requirements
            if isinstance(i, str) and 'vstutils' in i
        ],
        'mysql': ['mysqlclient<2.2'],
        'postgresql': ['psycopg[pool,c]'],
        # Ansible required packages
        'ansible29': load_requirements('requirements-ansible29.txt', os.getcwd()),
        'ansible-core': ['polemarch-ansible~=3.0.1'],
    },
    dependency_links=[
    ] + load_requirements('requirements-git.txt', os.getcwd()),
)

if __name__ == '__main__':
    make_setup(**kwargs)
