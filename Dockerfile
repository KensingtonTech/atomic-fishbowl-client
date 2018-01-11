FROM nginx:1.13.5
EXPOSE 443
VOLUME [ "/etc/kentech", "/var/kentech", "/var/log/nginx" ]
LABEL INSTALL="docker run --rm --name afb-nginx-installer-tmp --privileged -v /:/host -e HOST=/host -e IMAGE=IMAGE -e NAME=afb-nginx IMAGE /bin/atomic-install.sh"
LABEL UNINSTALL="docker run --rm --name afb-nginx-uninstaller-tmp --privileged -v /:/host -e HOST=/host -e IMAGE=IMAGE -e NAME=afb-nginx IMAGE /bin/atomic-uninstall.sh"
LABEL RUN="docker run --rm --name afb-nginx-run-tmp --privileged -v /:/host -e HOST=/host -e IMAGE=IMAGE -e NAME=afb-nginx IMAGE /bin/atomic-run.sh"
LABEL STOP="docker run --rm --name afb-nginx-stop-tmp --privileged -v /:/host -e HOST=/host -e IMAGE=IMAGE -e NAME=afb-nginx IMAGE /bin/atomic-stop.sh"
COPY atomic-*.sh /bin/
COPY atomic-afb-nginx.service /usr/lib/systemd/system/afb-nginx.service
COPY nginx.conf /etc/nginx/nginx.conf
COPY dist/ /opt/kentech/afb-client/webroot/