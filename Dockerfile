# syntax=docker/dockerfile:1

FROM registry.gitlab.com/vstconsulting/images:ubuntu-v4 AS build

RUN rm -f /etc/apt/apt.conf.d/docker-clean; echo 'Binary::apt::APT::Keep-Downloaded-Packages "true";' > /etc/apt/apt.conf.d/keep-cache
WORKDIR /usr/local/polemarch

ENV CC='ccache gcc'

RUN --mount=type=cache,target=/var/cache/apt \
    --mount=type=cache,target=/var/lib/apt \
    --mount=type=cache,target=/root/.cache/pip \
    apt update && \
    apt -y install --no-install-recommends \
    default-libmysqlclient-dev \
    python3.12-dev \
    libldap2-dev \
    libsasl2-dev \
    libffi-dev \
    libkrb5-dev \
    krb5-multidev \
    libssl-dev \
    libpq-dev \
    gcc

COPY . .

RUN --mount=type=cache,target=/root/.cache/pip \
    --mount=type=cache,target=/cache \
    --mount=type=cache,target=/usr/local/polemarch/.tox \
    tox -e build_for_docker

###############################################################

FROM registry.gitlab.com/vstconsulting/images:python3.12-optimized AS production

RUN rm -f /etc/apt/apt.conf.d/docker-clean; echo 'Binary::apt::APT::Keep-Downloaded-Packages "true";' > /etc/apt/apt.conf.d/keep-cache

ARG PACKAGE_NAME=polemarch

ENV WORKER=ENABLE \
    LC_ALL=C.UTF-8 \
    LANG=C.UTF-8 \
    POLEMARCH_PROJECTS_DIR=/projects \
    POLEMARCH_SQLITE_DIR=/var/lib/polemarch/

RUN --mount=type=cache,target=/var/cache/apt \
    --mount=type=cache,target=/var/lib/apt \
    --mount=type=cache,target=/root/.cache/pip \
    --mount=type=bind,from=build,source=/usr/local/polemarch/,target=/polemarch_env \
    apt update && \
    apt -y install --no-install-recommends \
        git \
        sudo \
        sshpass \
        libmysqlclient21 \
        libpq5 \
        libldap2 \
        libsasl2-2 \
        libffi8 \
        libssl3 \
        openssh-client && \
    if [ "$PACKAGE_NAME" = "polemarchplus" ]; then \
    apt install --no-install-recommends gpg wget lsb-release -y && \
    wget -O- https://apt.releases.hashicorp.com/gpg | gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | tee /etc/apt/sources.list.d/hashicorp.list && \
    apt update && apt install --no-install-recommends terraform -y; \
    fi && \
    python3.12 -m pip install cryptography paramiko 'pip~=23.3.1' && \
    mkdir -p /projects /hooks /run/openldap /etc/polemarch/hooks /var/lib/polemarch && \
    ls -la /polemarch_env/wheels && \
    python3.12 -m pip install --no-index --find-links /polemarch_env/wheels $PACKAGE_NAME[mysql,postgresql,ansible-core,production] && \
    find /usr/lib/python3.12 -regex '.*\(*.pyc\|__pycache__\).*' -delete && \
    apt remove gpg wget lsb-release -y && \
    apt autoremove -y && \
    rm -rf /tmp/* \
    /var/tmp/* \
    /var/log/apt/*

RUN usermod --login polemarch --move-home --home /home/polemarch ubuntu && \
    groupmod --new-name polemarch ubuntu && \
    chown -R polemarch /projects /hooks /run/openldap /etc/polemarch /var/lib/polemarch && \
    ln -s /usr/bin/python3.12 /usr/local/bin/python

USER polemarch

WORKDIR /home/polemarch

EXPOSE 8080

ENTRYPOINT []

CMD ["/usr/local/bin/polemarchctl", "webserver"]
