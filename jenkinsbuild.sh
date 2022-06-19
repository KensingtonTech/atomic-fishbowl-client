set -xe

VERS=`grep version package.json | head -1 | awk -F: '{ print $2 }' | sed 's/[",]//g' | tr -d '[[:space:]]'`
MAJOR=$(echo $VERS | cut -d'.' -f1)
MINOR=$(echo $VERS | cut -d'.' -f2)
PATCH=$(echo $VERS | cut -d'.' -f3)

if [[ $branch =~ "develop" ]]; then
  LEVEL=1
elif [[ $branch =~ "release" ]]; then
  LEVEL=3
elif [[ $branch =~ "hotfix" ]]; then
  LEVEL=4
elif [[ $branch =~ "master" ]]; then
  LEVEL=5
else
  LEVEL=1
fi

PKGNAME="atomic-fishbowl-nginx"
ARTIFACTNAME="afb-docker-nginx"
if [[ "$LEVEL" -eq 4 || "$LEVEL" -eq 5 ]]; then
  VER="$MAJOR.$MINOR.$PATCH.$BUILD_NUMBER"
else
  VER="$MAJOR.$MINOR.$PATCH.$BUILD_NUMBER-$LEVEL"  
fi
IMAGE_PREFIX="kensingtontech"

# Create build-properties.ts
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

echo "\$forceDebugBuild = $forceDebugBuild"

if [[ $LEVEL -ne 1 && $forceDebugBuild = "false" ]]; then
  # Prod build
  docker build --no-cache -f Dockerfile-prod -t ${PKGNAME}:${VER} . \
  && docker rmi $(docker images --filter=label=stage=builder --quiet)
else
  # Dev build
  docker build --no-cache -f Dockerfile-prod -t ${PKGNAME}:${VER} --build-arg DEBUG_BUILD=true . \
  && docker rmi $(docker images --filter=label=stage=builder --quiet)
fi

# push our tags to docker hub
if [ $DEPLOY = "true" ]; then
  docker tag ${PKGNAME}:${VER} ${IMAGE_PREFIX}/${PKGNAME}:${VER}
  docker push ${IMAGE_PREFIX}/${PKGNAME}:${VER}
  if [ $LEVEL -eq 5 ]; then
    docker image tag ${PKGNAME}:${VER} ${PKGNAME}:latest
    docker image tag ${PKGNAME}:${VER} ${IMAGE_PREFIX}/${PKGNAME}:latest
    docker push ${IMAGE_PREFIX}/${PKGNAME}:latest
  fi
fi

# create artifact
#docker save afb-nginx:${VER} ${PKGNAME}:latest | gzip > ${ARTIFACTNAME}_${VER}.tgz