API
===

Polemarch provides REST API for all it's functionality accessible via web GUI,
because our GUI also uses this API to work. Below there is an information about every
entity we have in Polemarch and methods applicable to it.

This is an example of api schema, but you can find actual schema on Polemarch host at
``/api/v2/openapi/``.

.. _structure:

Structure
-----------------------

In Polemarch we have some entities that can be nested to another entities. Below examples of such entites:

**Inventory** can be nested into **Project**

**Group** can be nested into **Inventory** or into another **Group** with ``children=true``

**Host** can be nested into **Inventory** or into another **Group** with ``children=false``

**User** can be nested into **Team**


For add entities into another, you only need send ``[{"id": [instance_id]}, ...]`` to subpath. Also you can insert instead of data results of bulk request, inner mechanism add all entities in result to parent entity.

.. vst_openapi:: ./api_schema.yaml
