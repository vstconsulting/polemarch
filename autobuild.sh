#!/usr/bin/env bash
CURRENT_VERSION=$(python3 setup.py --version | tr -d '\n')
TAG=$(git tag -l | tail -1 | tr -d '\n')
REGISTRY_IMAGE="${CI_REGISTRY}/${CI_PROJECT_PATH}"

export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

docker_worker (){
    docker tag ce_polemarch $1:$2
    docker push $1:$2
}

docker-compose build polemarch

docker login -u "${CI_REGISTRY_USER}" -p "${CI_BUILD_TOKEN}" "${CI_REGISTRY}"
docker login -u "${POLEMARCH_DOCKER_USER}" -p "${POLEMARCH_DOCKER_PASSWORD}"

docker_worker ${REGISTRY_IMAGE} ${CURRENT_VERSION}
docker_worker ${POLEMARCH_DOCKER_IMAGE_NAME} ${CURRENT_VERSION}

if [ "${CURRENT_VERSION}" != "${TAG}" ]; then
    docker_worker ${REGISTRY_IMAGE} "latest"
    docker_worker ${POLEMARCH_DOCKER_IMAGE_NAME} "latest"
fi
