PIP=pip2
PY=python2
LOC_TEST_ENVS = build,py27-django111-coverage,py34-django111-coverage,flake,pylint
ENVS = $(LOC_TEST_ENVS)
TESTS =
NAME = polemarch
USER = $(NAME)
VER = $(shell $(PY) -c 'import polemarch; print(polemarch.__version__)')
PIPARGS = --index-url=http://pipc.vst.lan:8001/simple/ --trusted-host pipc.vst.lan
ARCHIVE = $(NAME)-$(VER).tar.gz
LICENSE = AGPL-3+
define DESCRIPTION
 Polemarch is service for orchestration infrastructure by ansible.
 Simply WEB gui for orchestration infrastructure by ansible playbooks.
endef
export DESCRIPTION
SUMMARY = Infrastructure Heat Service for orchestration infrastructure by ansible.
VENDOR = VST Consulting <sergey.k@vstconsulting.net>
RELEASE = 0
COMPOSE = docker-compose-testrun.yml
COMPOSE_ARGS = --abort-on-container-exit
COMPLEX_TESTS_COMPOSE = docker-compose-tests.yml
COMPLEX_TESTS_COMPOSE_ARGS = '--abort-on-container-exit --build'

include rpm.mk
include deb.mk

all: compile


docs:
	-rm -rf doc/_build
	mkdir -p doc/_static
	$(PY) setup.py build_sphinx --build-dir doc/_build -W

test:
	tox -e $(ENVS) $(TESTS)

flake:
	tox -e flake

pylint:
	tox -e pylint

build: build-clean
	-rm -rf dist
	$(PY) setup.py sdist -v

compile: build-clean
	-rm -rf dist
	find ./polemarch -name "*.c" -print0 | xargs -0 rm -rf
	-rm -rf polemarch/doc/*
	$(PY) setup.py compile -v

install:
	$(PIP) install dist/$(ARCHIVE) django\>=1.8,\<1.12

uninstall:
	$(PIP) uninstall $(NAME)

clean: build-clean
	find ./polemarch -name "*.c" -print0 | xargs -0 rm -rf
	-rm -rf htmlcov
	-rm -rf .coverage
	-rm -rf dist
	-rm -rf build
	-rm -rf *.egg-info

build-clean:
	find . -name "*.pyc" -print0 | xargs -0 rm -rf
	-rm -rf build
	-rm -rf *.egg-info
	-rm -rf pylint_*

clean_dist:
	-rm -rf dist

fclean: clean
	find ./polemarch -name "*.c" -print0 | xargs -0 rm -rf
	-rm -rf .tox

rpm: compile
	echo "$$RPM_SPEC" > polemarch.spec
	rm -rf ~/rpmbuild
	mkdir -p ~/rpmbuild/SOURCES/
	ls -la
	cp -vf dist/$(ARCHIVE) ~/rpmbuild/SOURCES
	rpmbuild --verbose -bb polemarch.spec
	cp -v ~/rpmbuild/RPMS/x86_64/*.rpm dist/
	rm polemarch.spec

deb:
	rm -rf debian
	mkdir debian
	# create needed files
	echo 9 > debian/compat
	echo "$$DEBIAN_CONTROL" > debian/control
	echo "$$DEBIAN_COPYRIGHT" > debian/copyright
	echo "$$DEBIAN_RULES" > debian/rules
	echo "$$DEBIAN_PREINST" > debian/preinst
	echo "$$DEBIAN_POSTINST" > debian/postinst
	echo "$$DEBIAN_PRERM" > debian/prerm
	echo "$$DEBIAN_POSTRM" > debian/postrm
	echo "$$DEBIAN_CHANGELOG" > debian/changelog
	chmod +x debian/rules
	chmod +x debian/preinst
	chmod +x debian/postinst
	chmod +x debian/prerm
	chmod +x debian/postrm
	# build
	dpkg-buildpackage -uc -us
	mv -v ../$(NAME)_$(VER)*.deb dist/
	# cleanup
	rm -rf debian

compose:
	docker-compose -f $(COMPOSE) build

run:
	docker-compose -f $(COMPOSE) up $(COMPOSE_ARGS)

complex_tests:
	$(MAKE) run COMPOSE=$(COMPLEX_TESTS_COMPOSE) COMPOSE_ARGS=$(COMPLEX_TESTS_COMPOSE_ARGS)
