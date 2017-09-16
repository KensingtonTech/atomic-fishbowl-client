#!/bin/bash
CERTDIR=/etc/kentech/221b/certificates
DATADIR=/var/kentech/221b
LOGDIR=/var/log/nginx

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

#copy systemd unit file to host OS
cp -f /usr/lib/systemd/system/221b-nginx.service $HOST/etc/systemd/system

#load our systemd unit file
chroot $HOST /usr/bin/systemctl daemon-reload
