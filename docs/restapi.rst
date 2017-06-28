
Rest API
========

Polemarch provides REST API for all its functionality accessible via web GUI,
because our GUI also uses this API to work. Below comes information about every
entity we have in Polemarch and methods applied to it.

All methods urls stated with **/api/v1/** for first api version.
With other versions number will be changed. Current documentation writed for
version 1. All methods here described with this prefix to simplify copy & pasting.


Hosts
-----

.. http:get:: /api/v1/hosts/

    List of hosts.


    Results:

   .. sourcecode:: js


        {
            "results": {
                "hits": {
                    "hits": [
                        {
                            "fields": {
                                "link": "http://localhost:9999/docs/test-docs/en/latest/history/classes/coworking",
                                "path": [
                                    "history/classes/coworking"
                                ],
                                "project": [
                                    "test-docs"
                                ],
                                "title": [
                                    "PIE coworking"
                                ],
                                "version": [
                                    "latest"
                                ]
                            },
                            "highlight": {
                                "content": [
                                    "\nhelp fund more endeavors. Beta <em>test</em>  This first iteration of PIE was a very underground project"
                                ]
                            }
                        },
                    ],
                    "max_score": 0.47553805,
                    "total": 2
                }
            }
        }

Filters
-------

TODO: Here will write general information about filters to all kind of objects.

Access rights
-------------

TODO: Here will write general information about work with access rights to all
kind of objects.