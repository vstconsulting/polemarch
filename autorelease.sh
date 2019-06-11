#!/usr/bin/env bash
CURRENT_VERSION=$(python setup.py --version | tr -d '\n')
TAG=$(git tag -l $CURRENT_VERSION)
MESSAGE=${CI_COMMIT_MESSAGE:-"Release ${CURRENT_VERSION}"}

if [ -z "${TAG}" ]; then
    echo "Creating new tag ${CURRENT_VERSION}.";
    git tag $CURRENT_VERSION -m "${MESSAGE}"> /dev/null 2>&1;
    git push origin $CURRENT_VERSION > /dev/null 2>&1;
else
    echo "Current release ${CURRENT_VERSION} already exists. Update version to release."
fi
