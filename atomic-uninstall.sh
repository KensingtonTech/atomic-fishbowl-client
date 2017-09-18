#!/bin/bash

# Stop existing 221b-nginx container, if already running
WASSTARTED=0
chroot $HOST /usr/bin/docker ps -f name=$NAME | grep -q ${NAME}$
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
  #if [ $? -ne 0 ]; then
    #echo Restarting docker daemon to work around removal problem
    #chroot $HOST /usr/bin/systemctl restart docker
  #fi
else
  echo Container $NAME was not found
fi

# Remove systemd unit file
if [ -f "$HOST/etc/systemd/system/221b-nginx.service" ]; then
  echo Removing systemd unit file
  rm -f $HOST/etc/systemd/system/221b-nginx.service
  
  # Reload systemd unit files
  echo Reloading systemd config
  chroot $HOST /usr/bin/systemctl daemon-reload
fi