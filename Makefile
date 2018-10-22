PY = python2
PIP = $(PY) -m pip
PYTHON_BIN = $(shell $(PY) -c 'import sys, os; print(os.path.dirname(sys.executable))')
RELOCATE_BIN = $(PYTHON_BIN)/venvctrl-relocate
LOC_TEST_ENVS = py27-install,py36-install,flake,pylint
ENVS = $(LOC_TEST_ENVS)
ifndef TOX_ARGS
	TOX_ARGS =
endif
TESTS =
NAMEBASE = polemarch
USER = $(NAMEBASE)
NAME = $(NAMEBASE)
VER = $(shell $(PY) -c 'import $(NAME); print($(NAME).__version__)')
PROJECT_CTL = $(NAME)ctl
MAIN_APP = main
VSTUTILS_REQ = $(shell cat requirements.txt | grep vstutils | sed 's/\[.*\]/[doc]/')
VSTUTILS = $(VSTUTILS_REQ)
PIPARGS = $(shell echo -n "--cache-dir=$$(pwd)/.pip-cache")
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
DEFAULT_PREFIX = /opt
INSTALL_PREFIX = $(shell if [[ ! -z "${prefix}" ]]; then echo -n $(prefix); else echo -n $(DEFAULT_PREFIX); fi)
INSTALL_DIR = $(INSTALL_PREFIX)/${NAME}
INSTALL_BINDIR = $(INSTALL_DIR)/bin
INSTALL_PY = $(PY)
REQUIREMENTS = -r requirements.txt -r requirements-doc.txt
TMPDIR := $(shell mktemp -d)
RPM_BUILD = /tmp/rpmbuild_$(NAME)_$(VER)_$(RELEASE)
BUILD_DIR= $(TMPDIR)
PREBUILD_DIR = $(BUILD_DIR)/$(INSTALL_DIR)
PREBUILD_BINDIR = $(BUILD_DIR)/$(INSTALL_BINDIR)
SOURCE_DIR = $(shell pwd)
COMPOSE = docker-compose-testrun.yml
COMPOSE_ARGS = --abort-on-container-exit
COMPLEX_TESTS_COMPOSE = docker-compose-tests.yml
COMPLEX_TESTS_COMPOSE_ARGS = '--abort-on-container-exit --build'
define VARS_STR
PY=$(PY)
PIP=$(PIP)
PYTHON_BIN=$(PYTHON_BIN)
RELOCATE_BIN=$(RELOCATE_BIN)
NAMEBASE=$(NAMEBASE)
USER=$(USER)
NAME=$(NAME)
VER=$(VER)
RELEASE=$(RELEASE)
PROJECT_CTL=$(PROJECT_CTL)
MAIN_APP=$(MAIN_APP)
VSTUTILS=$(VSTUTILS)
BUILD_DIR=$(BUILD_DIR)
RPM_BUILD=$(RPM_BUILD)
INSTALL_DIR=$(INSTALL_DIR)
endef
export VARS_STR

include rpm.mk
include deb.mk

all: compile clean_prebuild prebuild


print_vars:
	echo "$$VARS_STR"
	which $(PY)

docs: print_vars
	-rm -rf doc/_build
	mkdir -p doc/_static
	$(PY) setup.py build_sphinx --build-dir doc/_build -W

test:
	tox $(TOX_ARGS) -e $(ENVS) $(TESTS)

flake:
	tox -e flake

pylint:
	tox -e pylint

build: build-clean print_vars
	-rm -rf dist
	$(PY) setup.py sdist -v

compile: build-clean print_vars
	-rm -rf dist
	find ./$(NAME) -name "*.c" -print0 | xargs -0 rm -rf
	-rm -rf polemarch/doc/*
	$(PIP) install -U $(VSTUTILS)
	$(PY) setup.py compile -v

prebuild: print_vars
	# Create virtualenv
	$(PY) -m virtualenv -p $(INSTALL_PY) --no-site-packages $(PREBUILD_DIR)
	# Install required packages
	$(PREBUILD_BINDIR)/pip install -U pip
	$(PREBUILD_BINDIR)/pip install -U dist/$(NAME)-$(VER).tar.gz $(REQUIREMENTS)
	$(PREBUILD_BINDIR)/pip install -U -r requirements-git.txt
	# RECORD files are used by wheels for checksum. They contain path names which
	# match the buildroot and must be removed or the package will fail to build.
	find $(PREBUILD_DIR) -name "RECORD" -exec rm -rf {} \;
	# Change the virtualenv path to the target installation direcotry.
	$(RELOCATE_BIN) --source=$(PREBUILD_DIR) --destination=$(INSTALL_DIR)
	# Remove sources for Clang
	find $(PREBUILD_DIR)/lib -type f -name "*.c" -print0 | xargs -0 rm -rf
	# Remove broken link
	-rm -rf $(PREBUILD_DIR)/local
	# Install settings
	-install -Dm 755 $(NAME)/$(MAIN_APP)/settings.ini $(BUILD_DIR)/etc/$(USER)/settings.ini.template
	# Install systemd services
	-install -Dm 755 initbin/$(NAME)web.service  $(BUILD_DIR)/etc/systemd/system/$(NAME).service
	# Install tmpdirs config
	-install -Dm 755 initbin/$(NAMEBASE).conf  $(BUILD_DIR)/etc/tmpfiles.d/$(NAMEBASE).conf
	# Create tmpdirs
	-mkdir -p $(BUILD_DIR)/var/log/$(NAMEBASE)
	-mkdir -p $(BUILD_DIR)/var/run/$(NAMEBASE)
	-mkdir -p $(BUILD_DIR)/var/lock/$(NAMEBASE)

localinstall: print_vars
	$(PY) -m virtualenv --no-site-packages $(INSTALL_DIR)
	$(INSTALL_BINDIR)/pip install -U pip
	$(INSTALL_BINDIR)/pip install -U $(VSTUTILS)
	$(INSTALL_BINDIR)/pip install -U dist/$(NAME)-$(VER).tar.gz $(REQUIREMENTS)
	$(INSTALL_BINDIR)/pip install -U -r requirements-git.txt
	find $(INSTALL_DIR)/lib -type f -name "*.c" -print0 | xargs -0 rm -rf
	$(MAKE) prebuild_deps BUILD_DIR=$(INSTALL_DIR)

install:
	# Change owner for packages
	-chown -R $(USER):$(USER) $(PREBUILD_DIR) $(BUILD_DIR)/var/{log,run,lock}/$(NAMEBASE) $(BUILD_DIR)/etc/$(USER)
	# Copy build
	cp -rf $(BUILD_DIR)/* /
	$(MAKE) clean_prebuild

uninstall:
	-rm -rf $(INSTALL_DIR)

clean_prebuild:
	-rm -rf $(BUILD_DIR)/*

clean: build-clean
	-rm -rf htmlcov
	-rm -rf .coverage
	-rm -rf dist
	-rm -rf build
	-rm -rf *.egg-info

build-clean:
	-rm pylint_* || true
	find ./$(NAME) -name '__pycache__' -print0 | xargs -0 rm -rf
	find ./$(NAME) -name "*.pyc" -print0 | xargs -0 rm -rf
	-rm -rf build
	-rm -rf *.egg-info

fclean: clean
	find ./$(NAME) -name "*.c" -print0 | xargs -0 rm -rf
	-rm -rf .tox

rpm: print_vars
	echo "$$RPM_SPEC" > $(NAME).spec
	rm -rf $(RPM_BUILD)
	mkdir -p $(RPM_BUILD)/SOURCES/
	ls -la
	rpmbuild --verbose -bb $(NAME).spec --define "_rpmdir ${RPM_BUILD}" --define "_topdir ${RPM_BUILD}"
	mkdir -p dist
	cp -v $(RPM_BUILD)/x86_64/*.rpm dist/
	rm -rf $(NAME).spec $(RPM_BUILD)

deb: print_vars
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
	dpkg-buildpackage -d -uc -us -j4
	mv -v ../$(NAME)_$(VER)*.deb dist/
	# cleanup
	rm -rf debian

compose_down:
	docker-compose -f $(COMPOSE) down

compose:
	docker-compose -f $(COMPOSE) build

run:
	docker-compose -f $(COMPOSE) up $(COMPOSE_ARGS)

complex_tests:
	$(MAKE) run COMPOSE=$(COMPLEX_TESTS_COMPOSE) COMPOSE_ARGS=$(COMPLEX_TESTS_COMPOSE_ARGS)
