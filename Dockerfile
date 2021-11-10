FROM vstconsulting/images:tox AS build

WORKDIR /usr/local/project

COPY . .

ENV WORKER=ENABLE \
    LC_ALL=en_US.UTF-8 \
    LANG=en_US.UTF-8

RUN tox -c tox_build.ini -e py36-build && \
    mv dist/ environment/docker_data/

###############################################################

FROM alpine:3.11

ENV WORKER=ENABLE \
    LC_ALL=en_US.UTF-8 \
    LANG=en_US.UTF-8

COPY --from=build /usr/local/project/environment/docker_data/ /etc/polemarch/

RUN cat /etc/polemarch/system_requirements.txt | xargs apk --update add && \
    cat /etc/polemarch/system_requirements_build.txt | xargs apk add --virtual .build-deps && \
    virtualenv -p python3 /opt/polemarch && \
    /opt/polemarch/bin/pip3 install -U pip wheel setuptools && \
    /opt/polemarch/bin/pip3 install -U -r /etc/polemarch/system_requirements_pip.txt && \
    mkdir -p /projects /hooks && \
    /opt/polemarch/bin/pip3 install -U /etc/polemarch/dist/$(ls /etc/polemarch/dist/ | grep "\.tar\.gz" | tail -1)[mysql,postgresql] && \
    /opt/polemarch/bin/pip3 install paramiko && \
    mkdir -p /run/openldap && \
    apk --purge del .build-deps && \
    rm -rf ~/.cache/pip/* && \
    rm -rf /var/cache/apk/*

EXPOSE 8080

ENTRYPOINT [ "/opt/polemarch/bin/polemarchctl" ]
CMD ["dockerrun"]
