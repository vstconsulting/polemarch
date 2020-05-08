/**
 * Common testing of PM guiFields instances.
 * Testing of toInner(), toRepresent() methods.
 */
window.qunitTestsArray['guiFields[field].{toInner, toRepresent}() - PM'] = {
    test: function() {
        let base_opt = {
            name: 'test_field',
        };
        let default_string_values =  [
            {
                input: {test_field: 'test-string'},
                output: {
                    toInner: 'test-string',
                    toRepresent: 'test-string',
                },
            },
            {
                input: {test_field: undefined},
                output: {
                    toInner: undefined,
                    toRepresent: undefined,
                },
            },
            {
                input: {test_field: ''},
                output: {
                    toInner: '',
                    toRepresent: '',
                },
            },
        ];
        let default_fk_values = [
            {
                input: {test_field: 1},
                output: {
                    toInner: 1,
                    toRepresent: 1,
                },
            },
            {
                input: {test_field: {value: 1,}},
                output: {
                    toInner: 1,
                    toRepresent: undefined,
                },
            },
            {
                input: {test_field: {prefetch_value: 'qwerty'}},
                output: {
                    toInner: undefined,
                    toRepresent: 'qwerty',
                },
            },
            {
                input: {test_field: {value: 1, prefetch_value: 'qwerty'}},
                output: {
                    toInner: 1,
                    toRepresent: 'qwerty',
                },
            },
        ];

        let fields_constructor = {
            inventory_autocomplete: {
                options: {format: 'inventory_autocomplete'},
                values: [].concat(default_fk_values, [
                    {
                        input: {test_field: {value: 'localhost,', prefetch_value: 'localhost,'}},
                        output: {
                            toInner: 'localhost,',
                            toRepresent: 'localhost,',
                        },
                    },
                    {
                        input: {test_field: {value: 'somedir', prefetch_value: 'somedir'}},
                        output: {
                            toInner: './somedir',
                            toRepresent: 'somedir',
                        },
                    },
                    {
                        input: {test_field: {value: './somedir', prefetch_value: './somedir'}},
                        output: {
                            toInner: './somedir',
                            toRepresent: './somedir',
                        },
                    },
                ]),
            },
            playbook_autocomplete: {
                options: {format: 'playbook_autocomplete'},
                values: default_fk_values,
            },
            module_autocomplete: {
                options: {format: 'module_autocomplete'},
                values: default_fk_values,
            },
            group_autocomplete: {
                options: {format: 'group_autocomplete'},
                values: default_fk_values,
            },
            history_initiator: {
                options: {format: 'history_initiator'},
                values: default_fk_values,
            },
            one_history_initiator: {
                options: {format: 'one_history_initiator'},
                values: default_fk_values,
            },
            ansible_json: {
                options: {format: 'one_history_execute_args'},
                values: [
                    {
                        input: {test_field: {name: 123, description: 'qwerty', c: true}},
                        output: {
                            toInner: {name: 123, description: 'qwerty', c: true},
                            toRepresent: {name: 123, description: 'qwerty', c: true},
                        },
                    },
                ],
            },
            fk_just_value: {
                options: {format: 'fk_just_value'},
                values: default_fk_values,
            },
            one_history_string: {
                options: {format: 'one_history_string'},
                values: default_string_values,
            },
            one_history_fk: {
                options: {format: 'one_history_fk'},
                values: default_fk_values,
            },
            one_history_date_time: {
                options: {format: 'one_history_date_time'},
                values: [
                    {
                        input: {test_field: '2019-05-08T07:08:07'},
                        output: {
                            toInner: '2019-05-08T07:08:07' + (app.api.getTimeZone() == 'UTC' ? 'Z' : moment.tz(app.api.getTimeZone()).format('Z')),
                            toRepresent: moment(moment.tz('2019-05-08T07:08:07', app.api.getTimeZone())).tz(moment.tz.guess()).format('YYYY-MM-DD HH:mm:ss'),
                        },
                    }
                ],
            },
            one_history_uptime: {
                options: {format: 'one_history_uptime'},
                values: [
                    {
                        input: {test_field: 10},
                        output: {
                            toInner: 10,
                            toRepresent: '00:00:10',
                        },
                    },
                    {
                        input: {test_field: 100},
                        output: {
                            toInner: 100,
                            toRepresent: '00:01:40',
                        },
                    },
                    {
                        input: {test_field: 100100},
                        output: {
                            toInner: 100100,
                            toRepresent: '01d 03:48:20',
                        },
                    },
                    {
                        input: {test_field: 10010010},
                        output: {
                            toInner: 10010010,
                            toRepresent: '03m 23d 20:33:30',
                        },
                    },
                    {
                        input: {test_field: 100100100},
                        output: {
                            toInner: 100100100,
                            toRepresent: '03y 02m 01d 13:35:00',
                        },
                    },
                    {
                        input: {test_field: 100100100},
                        output: {
                            toInner: 100100100,
                            toRepresent: '03y 02m 01d 13:35:00',
                        },
                    },
                ],
            },
            one_history_revision: {
                options: {format: 'one_history_revision'},
                values: [
                    {
                        input: {test_field: 'asd123wsaqd132edsad1d1w'},
                        output: {
                            toInner: 'asd123wsaqd132edsad1d1w',
                            toRepresent: 'asd123ws',
                        },
                    }
                ],
            },
            one_history_choices: {
                options: {format: 'one_history_choices', enum: ['abc', '123']},
                values: [
                    {
                        input: {test_field: 'abc'},
                        output: {
                            toInner: 'abc',
                            toRepresent: 'abc',
                        },
                    },
                    {
                        input: {test_field: '123'},
                        output: {
                            toInner: '123',
                            toRepresent: '123',
                        },
                    },
                ],
            },
            one_history_raw_inventory: {
                options: {format: 'one_history_raw_inventory'},
                values: default_string_values,
            },
            one_history_boolean: {
                options: {format: 'one_history_boolean'},
                values: [
                    {
                        input: {test_field: true},
                        output: {
                            toInner: true,
                            toRepresent: true,
                        }
                    },
                    {
                        input: {test_field: false},
                        output: {
                            toInner: false,
                            toRepresent: false,
                        }
                    },
                    {
                        input: {test_field: 'true'},
                        output: {
                            toInner: true,
                            toRepresent: true,
                        }
                    },
                    {
                        input: {test_field: 'false'},
                        output: {
                            toInner: false,
                            toRepresent: false,
                        }
                    },
                    {
                        input: {test_field: 'True'},
                        output: {
                            toInner: true,
                            toRepresent: true,
                        }
                    },
                    {
                        input: {test_field: 'False'},
                        output: {
                            toInner: false,
                            toRepresent: false,
                        }
                    },
                    {
                        input: {test_field: 1},
                        output: {
                            toInner: true,
                            toRepresent: true,
                        }
                    },
                    {
                        input: {test_field: 0},
                        output: {
                            toInner: false,
                            toRepresent: false,
                        }
                    },
                    {
                        input: {test_field: undefined},
                        output: {
                            toInner: undefined,
                            toRepresent: undefined,
                        }
                    },
                    {
                        input: {test_field: ''},
                        output: {
                            toInner: undefined,
                            toRepresent: undefined,
                        }
                    },
                    {
                        input: {test_field: '1212'},
                        output: {
                            toInner: undefined,
                            toRepresent: undefined,
                        }
                    },
                ],
            },
            one_history_execute_args: {
                options: {format: 'one_history_execute_args'},
                values: [
                    {
                        input: {test_field: {a: 123, b: 'qwerty', c: true}},
                        output: {
                            toInner: {a: 123, b: 'qwerty', c: true},
                            toRepresent: {a: 123, b: 'qwerty', c: true},
                        },
                    },
                ],
            }
        };

        for(let key in fields_constructor) {
            let item = fields_constructor[key];
            addTestForGuiFieldInstanceMethods($.extend(true, {}, base_opt, item.options), item.values);
        }
    }
};