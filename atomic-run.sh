#!/bin/bash

# define our data dirs
CERTDIR=/etc/kentech/221b/certificates
DATADIR=/var/kentech/221b
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
