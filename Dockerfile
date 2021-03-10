# Building image
FROM vstconsulting/images:latest AS build
WORKDIR /usr/local/project
COPY . .
RUN rm -rf dist && \
    tox -c tox_build.ini -e py38-build && \
    mv dist/ environment/docker_data/

###############################################################

FROM ubuntu:20.04

ENV WORKER=ENABLE \
    C_FORCE_ROOT=true

COPY --from=build /usr/local/project/environment/docker_data/ /etc/polemarch/

RUN apt update && \
    cat /etc/polemarch/system_requirements.txt | xargs apt-get -y install && \
    virtualenv -p python3.8 /opt/polemarch && \
    /opt/polemarch/bin/pip install -U pip wheel setuptools && \
    /opt/polemarch/bin/pip install -U -r /etc/polemarch/system_requirements_pip.txt && \
    mkdir -p /projects /hooks && \
    /opt/polemarch/bin/pip install -U /etc/polemarch/dist/$(ls /etc/polemarch/dist/ | \
        grep "\.tar\.gz" | tail -1)[mysql,postgresql] && \
    /opt/polemarch/bin/pip install paramiko && \
    mkdir -p /run/openldap && \
    apt autoremove -y && \
    apt-get clean && \
    rm -rf \
        /var/lib/apt/lists/* \
        /tmp/* \
        /var/tmp/* \
        /var/log/apt/*

EXPOSE 8080
ENTRYPOINT []
CMD ["/opt/polemarch/bin/polemarchctl", "dockerrun"]
