# syntax=docker/dockerfile:1

FROM vstconsulting/images:tox AS build

WORKDIR /usr/local/polemarch

COPY . .

RUN --mount=type=cache,target=/root/.cache/pip \
    --mount=type=cache,target=/cache \
    --mount=type=cache,target=/usr/local/polemarch/.tox \
    rm -rf dist/* && \
    tox -c tox_build.ini -e py36-build

###############################################################

FROM vstconsulting/images:python

RUN rm -f /etc/apt/apt.conf.d/docker-clean; echo 'Binary::apt::APT::Keep-Downloaded-Packages "true";' > /etc/apt/apt.conf.d/keep-cache

ENV WORKER=ENABLE \
    LC_ALL=en_US.UTF-8 \
    LANG=en_US.UTF-8 \
    POLEMARCH_PROJECTS_DIR=/projects

RUN --mount=type=cache,target=/var/cache/apt \
    --mount=type=cache,target=/var/lib/apt \
    --mount=type=cache,target=/root/.cache/pip \
    --mount=type=bind,from=build,source=/usr/local/polemarch/,target=/polemarch_env \
    apt update && \
    apt -y install --no-install-recommends \
        git \
        sudo \
        sshpass \
        libpcre3 \
        libpcre3-dev \
        python3.8-dev \
        libldap2-dev \
        libldap-2.4-2 \
        libsasl2-dev \
        libsasl2-2 \
        libffi-dev \
        libffi7 \
        libkrb5-dev \
        krb5-multidev \
        libssl-dev \
        libssl1.1 \
        gcc && \
    python3.8 -m pip install --upgrade pip -U \
        wheel \
        setuptools \
        cryptography \
        paramiko && \
    ln -s /usr/bin/python3.8 /usr/bin/python && \
    mkdir -p /projects /hooks /run/openldap /etc/polemarch/hooks && \
    python3.8 -m pip install /polemarch_env/dist/$(ls /polemarch_env/dist/ | grep "\.tar\.gz" | tail -1)[mysql,postgresql] && \
    apt remove -y \
        libpcre3-dev \
        python3.8-dev \
        libldap2-dev \
        libsasl2-dev \
        libssl-dev \
        libkrb5-dev \
        libffi-dev \
        default-libmysqlclient-dev \
        gcc && \
    apt autoremove -y && \
    rm -rf /tmp/* \
           /var/tmp/* \
           /var/log/apt/*

RUN useradd -m -s /bin/bash -U polemarch && \
    chown -R polemarch /projects /hooks /run/openldap /etc/polemarch

USER polemarch

WORKDIR /home/polemarch

EXPOSE 8080

ENTRYPOINT []

CMD ["/usr/local/bin/polemarchctl", "dockerrun"]
