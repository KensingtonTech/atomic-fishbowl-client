#!/bin/bash

# define our data dirs
CERTDIR=/etc/kentech/afb/certificates
DATADIR=/var/kentech/afb
LOGDIR=/var/log/nginx

# Stop existing container, if already running
WASSTARTED=0
chroot $HOST /usr/bin/docker ps -f name=$NAME | grep -q ${NAME}$
if [ $? -eq 0 ]; then
  WASSTARTED=1
  echo Container $NAME is already running
  exit
fi

# is our container already installed?
chroot $HOST /usr/bin/docker ps -a -f name=$NAME | grep -q ${NAME}$
if [ $? -eq 0 ]; then

  # Our container is installed, so run the installed version (don't perform an upgrade)

  # Create needed dirs and files, if missing
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

  if [[ -f ${HOST}${CERTDIR}/ssl.key && ! -f ${HOST}${CERTDIR}/ssl.cer ]]; then
    echo "Missing ${CERTDIR}/ssl.cer.  Renaming $CERTDIR/ssl.key to ssl.key.old"
    mv -f ${HOST}${CERTDIR}/ssl.key ${HOST}${CERTDIR}/ssl.key.old
  fi

  if [[ ! -f ${HOST}${CERTDIR}/ssl.key && -f ${HOST}${CERTDIR}/ssl.cer ]]; then
    echo "Missing $CERTDIR/ssl.key.  Renaming $CERTDIR/ssl.cer to ssl.cer.old"
    mv -f ${HOST}${CERTDIR}/ssl.cer ${HOST}${CERTDIR}/ssl.cer.old
  fi

  if [[ ! -f ${HOST}${CERTDIR}/ssl.key || ! -f ${HOST}${CERTDIR}/ssl.cer ]]; then
    echo "Generating new SSL keypair for HTTPS"
    chroot $HOST /usr/bin/openssl genrsa -out $CERTDIR/ssl.key 2048
    chroot $HOST /usr/bin/openssl req -new -sha256 -key $CERTDIR/ssl.key -out /tmp/tmp.csr -subj "/C=US/ST=Colorado/L=Denver/O=Kensington Technology Associates, Limited/CN=localhost/emailAddress=info@knowledgekta.com"
    chroot $HOST /usr/bin/openssl x509 -req -days 3650 -in /tmp/tmp.csr -signkey $CERTDIR/ssl.key -out $CERTDIR/ssl.cer
    chmod 600 ${HOST}${CERTDIR}/ssl.key ${HOST}${CERTDIR}/ssl.cer
  fi

  if [[ ! -d ${HOST}/etc/nginx ]]; then
    # Copy /etc/nginx dir to host if it doesn't exist
    echo "Creating /etc/nginx"
    cp -r /etc/nginx ${HOST}/etc/nginx
  else
    # Copy nginx.conf
    echo "Installing /etc/nginx/nginx.conf.  This will overwrite any changes that you have made.  The old nginx.conf will be renamed to nginx.conf.bak"
    if [[ -f ${HOST}/etc/nginx.conf ]]; then
      mv -f ${HOST}/etc/nginx/nginx.conf cp ${HOST}/etc/nginx/nginx.conf.bak
    fi
    cp -f /etc/nginx/nginx.conf ${HOST}/etc/nginx
  fi

  if [ -f $HOST/etc/systemd/system/${NAME}.service ]; then
    # our systemd unit is installed so start with systemd
    chroot $HOST /usr/bin/systemctl start $NAME
  
  else
    # no systemd unit file is installed, so start with docker
    chroot $HOST /usr/bin/docker start $NAME
  fi

else
  # the container is not installed - run the installer
  chroot $HOST /usr/bin/atomic install $NAME
  chroot $HOST /usr/bin/systemctl start $NAME
fi
