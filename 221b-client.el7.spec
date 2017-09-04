%define name kta-221b-client
%define buildroot %(mktemp -ud %{_tmppath}/%{name}-%{version}-%{release}-XXXXXX)

Name: %{name}
Version: %{version}
%define dist el7
Release: %{release}.%{?dist}
Summary: 221b-client

License: SEE LICENSE IN 221b.license
Source: 221b-client.tar.gz
BuildRoot: %{buildroot}
AutoReqProv: no

%description
Client files for 221B

%prep
%setup -q -c -n %{name}

%build
npm prune --production
npm rebuild

%pre

%install
mkdir -p %{buildroot}/opt/kentech/221b-client/webroot
cp -r ./* %{buildroot}/opt/kentech/221b-client/webroot

%post

%preun

%postun

%clean
rm -rf %{buildroot}

%files
%license 221b.license
%defattr(644, 221b-server, 221b-server, 755)
/opt/kentech/221b-client/webroot