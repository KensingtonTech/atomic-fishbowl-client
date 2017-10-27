#!/bin/bash

#define our data dirs
CERTDIR=/etc/kentech/221b/certificates
DATADIR=/var/kentech/221b
LOGDIR=/var/log/nginx

# Create 221b dirs
if [ ! -d ${HOST}${CERTDIR} ]; then
  echo Creating $CERTDIR
	mkdir -p ${HOST}${CERTDIR}
  chmod 700 ${HOST}${CERTDIR}
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
  echo "Generating new SSL keypair for HTTPS"
  chroot $HOST /usr/bin/openssl genrsa -out $CERTDIR/221b.key 2048
  chroot $HOST /usr/bin/openssl req -new -sha256 -key $CERTDIR/221b.key -out /tmp/tmp.csr -subj "/C=US/ST=Colorado/L=Denver/O=Kensington Technology Associates, Limited/CN=localhost/emailAddress=info@knowledgekta.com"
  chroot $HOST /usr/bin/openssl x509 -req -days 3650 -in /tmp/tmp.csr -signkey $CERTDIR/221b.key -out $CERTDIR/221b.pem
  chmod 600 ${HOST}${CERTDIR}/221b.key ${HOST}${CERTDIR}/221b.pem
fi

# Create network '221b-network' if not already there
chroot $HOST /usr/bin/docker network ls  | awk '{print $2}' | grep -q ^221b-network$
if [ $? -ne 0 ]; then
  echo Creating bridge network 221b-network
  chroot $HOST /usr/bin/docker network create --subnet 172.31.255.240/28 --gateway 172.31.255.241 -d bridge 221b-network >/dev/null
fi

# Stop existing container, if already running
WASSTARTED=0
chroot $HOST /usr/bin/docker ps -f name=$NAME | grep -q ${NAME}$
if [ $? -eq 0 ]; then
  WASSTARTED=1
  echo Stopping container $NAME
  chroot $HOST /usr/bin/docker stop $NAME
fi

# Remove existing container, if present
chroot $HOST /usr/bin/docker ps -a -f name=$NAME | grep -q ${NAME}$
if [ $? -eq 0 ]; then
  echo Removing existing $NAME container
  chroot $HOST /usr/bin/docker rm $NAME
  #if [ $? -ne 0 ]; then
    #echo Restarting docker daemon to work around removal problem
    #chroot $HOST /usr/bin/systemctl restart docker
  #fi
fi

# Create container
echo Creating container $NAME from image $IMAGE
chroot $HOST /usr/bin/docker create --name $NAME --network 221b-network --ip 172.31.255.244 --add-host 221b-server:172.31.255.243 -p 443:443 -v /etc/kentech:/etc/kentech:ro -v /var/kentech:/var/kentech:ro,z -v /var/log/nginx:/var/log/nginx:rw,Z $IMAGE >/dev/null

# Copy systemd unit file to host OS
echo Installing systemd unit file
echo "To control, use:  systemctl [ start | stop | status | enable | disable ] $NAME"
cp -f /usr/lib/systemd/system/${NAME}.service ${HOST}/etc/systemd/system

# Load our systemd unit file
chroot $HOST /usr/bin/systemctl daemon-reload

if [[ $WASSTARTED -eq 1 ]]; then
  echo Starting container $NAME
  chroot $HOST /usr/bin/systemctl start $NAME
fi
