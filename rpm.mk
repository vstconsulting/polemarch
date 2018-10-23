define RPM_SPEC
# Macros
%define name $(NAME)
%define shortname $(NAME)
%define namebase $(NAMEBASE)
%define user $(USER)
%define version $(VER)
%define release $(RELEASE)
%define __prelink_undo_cmd %{nil}
%define _binaries_in_noarch_packages_terminate_build   0
%define unmangled_version %{version}
# Globals
%global __os_install_post %(echo '%{__os_install_post}' | sed -e 's!/usr/lib[^[:space:]]*/brp-python-bytecompile[[:space:]].*$$!!g')


# Tags
Name: %{name}
Version: %{version}
Release: %{release}
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
Requires: krb5-devel, krb5-libs, openldap-devel


%description
$(DESCRIPTION)



# Blocks
%files
%defattr(-,%{user},%{user},-)
$(INSTALL_DIR)
/etc/%{namebase}
/var/log/%{namebase}
/var/run/%{namebase}
/var/lock/%{namebase}
%attr(755,root,root) /etc/systemd/system/%{shortname}.service
%attr(755,root,root) /etc/tmpfiles.d/%{namebase}.conf

%pre
id -u %{user} || useradd %{user}
id -g %{user} || groupadd %{user}

%install
make BUILD_DIR=%{buildroot}

cd %{buildroot}
cd -

%post
su - %{user} -c "/opt/%{name}/bin/%{shortname}ctl migrate"
/usr/bin/systemctl daemon-reload
/usr/bin/systemctl enable %{shortname}.service

%preun
/usr/bin/systemctl disable %{shortname}.service > /dev/null 2>&1
if [ "$$1" = "0" ]; then
	service %{shortname} stop >/dev/null 2>&1
fi

%prep
rm -rf %{buildroot}/*
cd %{_topdir}/BUILD
cp -rf $(SOURCE_DIR)/* .

%clean
rm -rf %{buildroot}
endef
export RPM_SPEC
