FROM nginx:1.13.5
EXPOSE 443
VOLUME [ "/etc/kentech", "/var/kentech", "/var/log/nginx" ]
LABEL INSTALL="docker run --rm --name 221b-nginx-installer-tmp --privileged -v /:/host -e HOST=/host -e IMAGE=IMAGE -e NAME=221b-nginx IMAGE /bin/install.sh"
COPY nginx.conf /etc/nginx/nginx.conf
COPY atomic-install.sh /bin/install.sh
COPY atomic-221b-nginx.service /usr/lib/systemd/system/221b-nginx.service
COPY dist/ /opt/kentech/221b-client/webroot/