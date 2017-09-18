#!/bin/bash

# Stop existing 221b-nginx container, if already running
chroot $HOST /usr/bin/docker ps -f name=$NAME | grep -q ${NAME}$
if [ $? -eq 0 ]; then
  chroot $HOST /usr/bin/docker stop $NAME
fi
