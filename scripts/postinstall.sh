#!/bin/bash
cp -f node_modules/pdfjs-dist/build/pdf.worker.min.js src/resources/ \
&& cp -f node_modules/isotope-layout/dist/isotope.pkgd.min.js src/resources/ \
&& npm run zipnwcontext