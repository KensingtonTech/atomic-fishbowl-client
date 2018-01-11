%define name kta-atomic-fishbowl-client
%define buildroot %(mktemp -ud %{_tmppath}/%{name}-%{version}-%{release}-XXXXXX)

Name: %{name}
Version: %{version}
BuildArch: noarch
%define dist el7
Release: %{release}.%{?dist}
Summary: atomic-fishbowl-client

License: SEE LICENSE IN atomic-fishbowl.license
Source: atomic-fishbowl-client.tar.gz
BuildRoot: %{buildroot}
AutoReqProv: no

%description
Client files for Atomic Fishbowl

%prep
%setup -q -c -n %{name}

%build

%pre

%install
mkdir -p %{buildroot}/opt/kentech/afb-client/webroot
cp -r ./* %{buildroot}/opt/kentech/afb-client/webroot

%post

%preun

%postun

%clean
rm -rf %{buildroot}

%files
%license atomic-fishbowl.license
%defattr(644, afb-server, afb-server, 755)
/opt/kentech/afb-client/webroot