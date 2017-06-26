PIP=pip
PY=python
LOC_TEST_ENVS = build,py27-django18-coverage,py34-django111-coverage,pep,flake,pylint
ENVS = $(LOC_TEST_ENVS)
TESTS =
NAME = polemarch
VER = $(shell $(PY) -c 'import polemarch; print(polemarch.__version__)')
RELEASE=0
ARCHIVE = $(NAME)-$(VER).tar.gz

all: rpm build-clean

test:
	tox -e $(ENVS) $(TESTS)

flake:
	tox -e flake

pylint:
	tox -e pylint

build: build-clean
	-rm -rf dist
	$(PY) setup.py build -v
	$(PY) setup.py sdist -v

compile: build-clean
	-rm -rf dist
	$(PY) setup.py compile -v

install:
	$(PIP) install dist/$(ARCHIVE) django\>=1.8,\<1.12

uninstall:
	$(PIP) uninstall $(NAME)

clean: build-clean
	-rm -rf htmlcov
	-rm -rf .coverage
	-rm -rf dist
	-rm -rf build
	-rm -rf *.egg-info

build-clean:
	find . -name "*.pyc" -print0 | xargs -0 rm -rf
	find ./polemarch -name "*.c" -print0 | xargs -0 rm -rf
	-rm -rf build
	-rm -rf *.egg-info
	-rm pylint_*

fclean: clean
	-rm -rf .tox

rpm: compile
	rm -rf ~/rpmbuild
	mkdir -p ~/rpmbuild/SOURCES/
	ls -la
	cp -vf dist/$(ARCHIVE) ~/rpmbuild/SOURCES
	rpmbuild --verbose -bb polemarch.spec -D 'version $(VER)' -D 'release $(RELEASE)'
	cp -vr ~/rpmbuild/RPMS dist/
