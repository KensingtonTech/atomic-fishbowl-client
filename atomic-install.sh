#!/bin/bash
CERTDIR=$HOST/etc/kentech/221b/certificates
if [ ! -d $CERTDIR]; then
	mkdir -p $CERTDIR
fi

if [[ -f $CERTDIR/221b.key && ! -f $CERTDIR/221b.pem ]]; then
  echo "Missing $CERTDIR/221b.pem.  Renaming $CERTDIR/221b.key to 221b.key.old"
  mv -f $CERTDIR/221b.key $CERTDIR/221b.key.old
fi

if [[ ! -f $CERTDIR/221b.key && -f $CERTDIR/221b.pem ]]; then
  echo "Missing $CERTDIR/221b.key.  Renaming $CERTDIR/221b.pem to 221b.pem.old"
  mv -f $CERTDIR/221b.pem $CERTDIR/221b.pem.old
fi

if [[ ! -f $CERTDIR/221b.key || ! -f $CERTDIR/221b.pem ]]; then
  echo "Generating new SSL keypair"
  openssl genrsa -out $CERTDIR/221b.key 2048
  openssl req -new -sha256 -key $CERTDIR/221b.key -out /tmp/tmp.csr -subj "/C=US/ST=Colorado/L=Denver/O=Kensington Technology Associates, Limited/CN=localhost/emailAddress=info@knowledgekta.com"
  openssl x509 -req -days 3650 -in /tmp/tmp.csr -signkey $CERTDIR/221b.key -out $CERTDIR/221b.pem
fi
