//{% extends "gui/service-worker.js" %}
//{% load request_static %}
//{% autoescape off %}

//{% block resource_list %}
const ADDITIONAL_FILES_LIST = [
    "{% static 'img/logo/vertical.png' %}",
];
//{% endblock %}

//{% endautoescape %}