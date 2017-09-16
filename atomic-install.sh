#!/bin/bash

CERTDIR=/etc/kentech/221b/certificates
DATADIR=/var/kentech/221b
LOGDIR=/var/log/nginx

# Create 221b dirs

if [ ! -d ${HOST}${CERTDIR} ]; then
  echo Creating $CERTDIR
	mkdir -p ${HOST}${CERTDIR}
fi

if [ ! -d ${HOST}${DATADIR} ]; then
  echo Creating $DATADIR
  mkdir -p ${HOST}${DATADIR}
fi

if [ ! -d ${HOST}${LOGDIR} ]; then
  echo Creating $LOGDIR
  mkdir -p ${HOST}${LOGDIR}
fi

if [[ -f ${HOST}${CERTDIR}/221b.key && ! -f ${HOST}${CERTDIR}/221b.pem ]]; then
  echo "Missing ${CERTDIR}/221b.pem.  Renaming $CERTDIR/221b.key to 221b.key.old"
  mv -f ${HOST}${CERTDIR}/221b.key ${HOST}${CERTDIR}/221b.key.old
fi

if [[ ! -f ${HOST}${CERTDIR}/221b.key && -f ${HOST}${CERTDIR}/221b.pem ]]; then
  echo "Missing $CERTDIR/221b.key.  Renaming $CERTDIR/221b.pem to 221b.pem.old"
  mv -f ${HOST}${CERTDIR}/221b.pem ${HOST}${CERTDIR}/221b.pem.old
fi

if [[ ! -f ${HOST}${CERTDIR}/221b.key || ! -f ${HOST}${CERTDIR}/221b.pem ]]; then
  echo "Generating new SSL keypair"
  chroot $HOST /usr/bin/openssl genrsa -out $CERTDIR/221b.key 2048
  chroot $HOST /usr/bin/openssl req -new -sha256 -key $CERTDIR/221b.key -out /tmp/tmp.csr -subj "/C=US/ST=Colorado/L=Denver/O=Kensington Technology Associates, Limited/CN=localhost/emailAddress=info@knowledgekta.com"
  chroot $HOST /usr/bin/openssl x509 -req -days 3650 -in /tmp/tmp.csr -signkey $CERTDIR/221b.key -out $CERTDIR/221b.pem
fi

# Stop existing 221b-nginx container, if already running
WASSTARTED=0
chroot $HOST /usr/bin/docker ps -f name=$NAME | /usr/bin/grep -q ${NAME}$
if [ $? -eq 0 ]; then
  WASSTARTED=1
  echo Stopping container $NAME
  chroot $HOST /usr/bin/docker stop $NAME
fi

# Remove existing 221b-nginx container, if present
chroot $HOST /usr/bin/docker ps -a -f name=$NAME | grep -q ${NAME}$
if [ $? -eq 0 ]; then
  echo Removing existing $NAME container
  chroot $HOST /usr/bin/docker rm $NAME
fi

# Create container
echo Creating container $NAME from image $IMAGE
chroot $HOST /usr/bin/docker create --name $NAME --net=host -p 443:443 -v /etc/kentech:/etc/kentech:ro -v /var/kentech:/var/kentech:rw -v /var/log/nginx:/var/log/nginx:rw $IMAGE

# Copy systemd unit file to host OS
echo Installing systemd unit file
echo To control, use:  systemctl [ start | stop | status | enable | disable ] 221b-nginx
cp -f /usr/lib/systemd/system/221b-nginx.service $HOST/etc/systemd/system

# Load our systemd unit file
chroot $HOST /usr/bin/systemctl daemon-reload

if [ $WASSTARTED -eq 1 ]; then
  echo Starting container $NAME
  chroot $HOST /usr/bin/systemctl start $NAME
fi