define RPM_SPEC
# Macros
%define name $(NAME)
%define shortname $(NAME)
%define file_permissions_user $(USER)
%define file_permissions_group $(USER)
%define venv_cmd $(PY) -m virtualenv --no-site-packages
%define venv_name %{name}
%define venv_install_dir /opt/%{venv_name}
%define venv_dir %{buildroot}/%{venv_install_dir}
%define venv_bin %{venv_dir}/bin
%define venv_python %{venv_bin}/python
%define venv_pip %{venv_python} %{venv_bin}/pip install $(PIPARGS)
%define version $(VER)
%define release $(RELEASE)
%define __prelink_undo_cmd %{nil}
%define _binaries_in_noarch_packages_terminate_build   0
# %{?version: %{?version: %{error: version}}}
%define unmangled_version %{version}
# %{?release: %{?release: %{error: release}}}
# Globals
%global __os_install_post %(echo '%{__os_install_post}' | sed -e 's!/usr/lib[^[:space:]]*/brp-python-bytecompile[[:space:]].*$$!!g')


# Tags
Name: %{name}
Version: %{version}
Release: %{release}
Source0: $(NAME).tar.gz
Summary: $(SUMMARY)
Group: Application/System
Vendor: $(VENDOR)
License: ${LICENSE}
AutoReq: No
AutoProv: No
BuildRequires: python, openssl-devel, libyaml-devel
Requires: python, openssl-devel
Requires: python-virtualenv
Requires: git
Requires: libyaml-devel
Requires: krb5-devel, krb5-libs


%description
$(DESCRIPTION)



# Blocks
%files
%defattr(-,%{file_permissions_user},%{file_permissions_group},-)
/%{venv_install_dir}
/etc/%{name}
/var/log/%{name}
/var/run/%{name}
/var/lock/%{name}
%attr(755,root,root) /etc/systemd/system/%{shortname}web.service
%attr(755,root,root) /etc/systemd/system/%{shortname}worker.service
%attr(755,root,root) /etc/tmpfiles.d/%{shortname}.conf

%pre
id -u %{file_permissions_user} &>/dev/null || useradd %{file_permissions_user}
id -g %{file_permissions_group} &>/dev/null || groupadd %{file_permissions_group}

%install
make BUILD_DIR=%{buildroot}

cd %{buildroot}
cd -
# Setup init scripts
mkdir -p $$RPM_BUILD_ROOT/etc/systemd/system
mkdir -p $$RPM_BUILD_ROOT/etc/tmpfiles.d
mkdir -p $$RPM_BUILD_ROOT/etc/%{name}
mkdir -p $$RPM_BUILD_ROOT/var/log/%{name}
mkdir -p $$RPM_BUILD_ROOT/var/run/%{name}
mkdir -p $$RPM_BUILD_ROOT/var/lock/%{name}
mkdir -p $$RPM_BUILD_ROOT/usr/bin
install -m 755 %{name}/main/settings.ini $$RPM_BUILD_ROOT/etc/%{name}/settings.ini.template
install -m 755 initbin/%{shortname}web.service $$RPM_BUILD_ROOT/etc/systemd/system/%{shortname}web.service
install -m 755 initbin/%{shortname}worker.service $$RPM_BUILD_ROOT/etc/systemd/system/%{shortname}worker.service
install -m 755 initbin/%{shortname}.conf $$RPM_BUILD_ROOT/etc/tmpfiles.d/%{shortname}.conf

%post
# sudo -H -u %{name} /opt/%{name}/bin/%{shortname}ctl migrate
su - %{name} -c "/opt/%{name}/bin/%{shortname}ctl migrate"
/usr/bin/systemctl daemon-reload
/usr/bin/systemctl enable %{shortname}web.service
/usr/bin/systemctl enable %{shortname}worker.service

%preun
/usr/bin/systemctl disable %{shortname}web.service > /dev/null 2>&1
/usr/bin/systemctl disable %{shortname}worker.service > /dev/null 2>&1
if [ "$$1" = "0" ]; then
	service %{shortname}web stop >/dev/null 2>&1
	service %{shortname}worker stop >/dev/null 2>&1
fi

%prep
rm -rf %{buildroot}/*
cd %{_topdir}/BUILD
cp -rf $(SOURCE_DIR)/* .

%clean
rm -rf %{buildroot}
endef
export RPM_SPEC
