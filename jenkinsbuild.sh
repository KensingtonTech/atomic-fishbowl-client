set -x

VERS=`grep version package.json | head -1 | awk -F: '{ print $2 }' | sed 's/[",]//g' | tr -d '[[:space:]]'`
MAJOR=$(echo $VERS | cut -d'.' -f1)
MINOR=$(echo $VERS | cut -d'.' -f2)
PATCH=$(echo $VERS | cut -d'.' -f3)

if [[ $branch =~ "develop" ]]; then
  LEVEL=1
elif [[ $branch =~ "release" ]]; then
  LEVEL=3
elif [[ $branch =~ "rsac-2018" ]]; then
  LEVEL=3
elif [[ $branch =~ "hotfix" ]]; then
  LEVEL=4
elif [[ $branch =~ "master" ]]; then
  LEVEL=5
else
  LEVEL=1
fi

PKGNAME="afb-nginx"
ARTIFACTNAME="afb-docker-nginx"
VER="$MAJOR.$MINOR.$PATCH.$BUILD_NUMBER-$LEVEL"
REPONAME="kentechrepo:5000"

#Create our build-properties.js file
cat > src/app/build-properties.ts << EOF
export const buildProperties = {
  major: $MAJOR,
  minor: $MINOR,
  patch: $PATCH,
  build: $BUILD_NUMBER,
  level: $LEVEL
};

/*
build:
  1: development
  2: beta
  3: release candidate
  4: hotfix
  5: final release
*/
EOF

npm install
npm run fixpdf

echo "\$forceDebugBuild = $forceDebugBuild"

if [[ "$LEVEL" -ne 1 && "$forceDebugBuild" == "false" ]]; then
  # Prod build
  sed -i'' "s/^import 'core-js\/es7\/reflect';/\/\/ import 'core-js\/es7\/reflect';/" src/polyfills.ts
  ng build --prod --aot --build-optimizer
else
  # Dev build
  sed -i'' "s/^import 'core-js\/es7\/reflect';/\/\/ import 'core-js\/es7\/reflect';/" src/polyfills.ts
  ng build
fi

cp node_modules/isotope-layout/dist/isotope.pkgd.min.js src/resources
cp atomic-fishbowl.license dist/
rm -f dist/roboto*.{ttf,svg,eot}

#now build the docker container
docker build -t ${PKGNAME}:${VER} -t ${PKGNAME}:latest -t ${REPONAME}/${PKGNAME}:latest -t ${REPONAME}/${PKGNAME}:${VER} .

#push our two tags to our private registry
docker push ${REPONAME}/${PKGNAME}:${VER}
docker push ${REPONAME}/${PKGNAME}:latest

#create artifact
docker save afb-nginx:${VER} ${PKGNAME}:latest | gzip > ${ARTIFACTNAME}_${VER}.tgz