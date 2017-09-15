FROM nginx:1.13.5
EXPOSE 443
VOLUME [ "/etc/kentech", "/var/kentech", "/var/log/nginx" ]
CMD ["nginx", "-g", "daemon off;"]
LABEL INSTALL="docker run --rm --privileged -v /:/host -e HOST=/host -e LOGDIR=${LOGDIR} -e IMAGE=IMAGE -e NAME=NAME IMAGE /bin/install.sh"
COPY nginx.conf /etc/nginx/nginx.conf
COPY dist/ /opt/kentech/221b-client/webroot/
COPY atomic-install.sh /bin/install.sh