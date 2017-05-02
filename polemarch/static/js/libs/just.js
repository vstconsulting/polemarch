/*!
 * JUST JavaScript template engine v0.1.8
 * https://github.com/baryshev/just
 *
 * Copyright 2012, Vadim M. Baryshev <vadimbaryshev@gmail.com>
 * Licensed under the MIT license
 * https://github.com/baryshev/just/LICENSE
 *
 * Includes Cross-Browser Split 1.0.1
 * http://xregexp.com/
 * Copyright Steven Levithan <stevenlevithan.com>
 * Released under the MIT license
 */
(function () {
	'use strict'; 
	var
		JUST = function (newOptions) {  
			var
				options = {
					open : '<%',
					close : '%>',
					ext : '',
					root : ''
				},
				trimExp = /^\s+|\s+$/g,
				escapeExp = /([.*+?\^=!:${}()|\[\]\/\\])/g,
				STATE_RAW = 0,
				STATE_PARTIAL = 1,
				STATE_EXTEND = 2,
				STATE_CONDITION = 3,
				STATE_ELSE = 4,
				STATE_SWITCH = 5,
				STATE_CASE = 6,
				STATE_DEFAULT = 7,
				STATE_LOOP = 8,
				STATE_SUBBLOK = 9,
				STATE_TEXT = 10,
				cache = {},
                                countUid = 0,
                                
				regExpEscape = function (str) {
					return String(str).replace(escapeExp, '\\$1');
				},
                                reactiveReplace = function(html)
                                {
                                     
                                    /* Поделить текст на ~ блоки
                                     *
                                     * Если блок открывающий то рекурсивно в глубину уходим
                                     * <~ records[j]/name ~>
                                     * Если блок закрывающий то поднимаемся на верх
                                     * <~> 
                                     * 
                                     * рекурсивно заменим блоки циклов на вложеные подшаблоны с замыканием переменных из родительского шаблона 
                                     */
                                    var status = 0
                                    var parts = html.split(/<(?=~)/g)

                                    var startPart = {}
                                    var lastStatus = 0;

                                    for(var i in parts)
                                    {
                                        var val = parts[i]
                                        if(val.charAt(0) == '~' && val.charAt(1) == '>')
                                        {
                                            //console.log("Конец", status)
                                            if(status != 0 && status == lastStatus)
                                            { 
                                                var forCode = startPart[lastStatus].substr(1).split(/>/, 1)
                                                if(!forCode || !forCode.length )
                                                {
                                                    console.error("Invalid sub block definition", forCode)
                                                }
                                                
                                                forCode = forCode[0].trim()
                                                var forObject = forCode.match(/[^ ]+$/)
                                                
                                                if(forObject[0].indexOf(".") != -1)
                                                {
                                                    // var j in li.ne
                                                    forObject = forObject[0]
                                                    forObject = forObject.match(/^(.*)\.?([^.]+)$/) 
                                                }
                                                else
                                                {
                                                    // var j in line
                                                    forObject[1] = 'this.data'
                                                    forObject[2] = forObject[0]
                                                }
                                                
                                                var body = startPart[lastStatus].substr(forCode.length+2)
                                                
                                                countUid++;
                                                var tplName = '_superId'+countUid
                                                options.root[tplName] = '<% for('+forCode+'){ %> '+body+'  <% } %>'
                                                // console.info(tplName, options.root[tplName])
                                                
                                                var res = html.replace("<"+startPart[lastStatus]+"<~>", 
                                                                "<%= "+forObject[1]+".justHtml('"+forObject[2]+"', this.partialWatch, ['"+tplName+"', this.data]) %>"
                                                                ) 
                                                // console.info("html:", html)
                                                // console.error("res:", res)
                                                return reactiveReplace(res) 
                                            }
                                            status--

                                        }
                                        else if(val.charAt(0) == '~')
                                        {
                                            status++
                                            //console.log("Начало", status)
                                            lastStatus = status
                                            startPart[status] = val
                                        }
                                        else
                                        {
                                            //console.log("Продолжение", status)
                                        }

                                    }

                                    return html
                                },
				parseToCode = function (html) {
                                    
                                    html = reactiveReplace(html)
                                    // console.log("restpl", html) 
                                    
                                    // <%= Вывод html
                                    // <%- Вывод текста ( для защиты от xxs )
                                    
                                    /*
                                        myline = {line:[1, 2, 3]}
                                        $(".content").html(spajs.just.render('test2', myline))
                                     */ 
/*
<!-- Подключаем шаблон для списка записей -->
<script id="test-list" type="text/x-just" style="display: none;" data-just="test">
    AAA 
        <~var j in line>
            <div>
                <%= j %> - <%= line.justHtml(j) %>
            </div>
        <~> 
    BBB
</script>

                                    */
                                    var
						lineNo = 1,
						buffer = [ 'with (this.data) { with (this.customData) { this.buffer.push(\'' ],
						matches = html.split(new RegExp(regExpEscape(options.open) + '((?:.|[\r\n])+?)(?:' + regExpEscape(options.close) + '|$)')),
						length,	i, text, prefix, postfix, line, tmp, jsFromPos, state;

					for (i = 0, length = matches.length; i < length; i++) {
						text = matches[i];
						if (i % 2 === 1) {
							line = 'this.line=' + lineNo;
							jsFromPos = 1;
							state = STATE_RAW;
							switch (text.charAt(0)) {
							case '@':
								prefix = '\',(' + line + ', this.partial(';
								postfix = ')),\'';
								state = STATE_PARTIAL;
								break;
							case '[':
								prefix = '\');' + line + ';this.blockStart(\'';
								postfix = '\');this.buffer.push(\'';
								break;
							case ']':
								prefix = '\');' + line + ';this.blockEnd(';
								postfix = ');this.buffer.push(\'';
								break;
							case '=':
								prefix = '\',(' + line + ', ';
								postfix = '),\'';
								break;
							case '-':
								prefix = '\',(' + line + ', ';
								postfix = '),\'';
								state = STATE_TEXT;
								break;
							case '?':
								prefix = '\');' + line + ';';
								postfix = 'this.buffer.push(\'';
								state = STATE_CONDITION;
								break;
							case ':':
								prefix = '\');' + line + ';}else';
								postfix = 'this.buffer.push(\'';
								state = STATE_ELSE;
								break;
							case '|':
								prefix = '\');' + line + ';';
								postfix = 'this.buffer.push(\'';
								state = STATE_LOOP;
								break;
							case '~':
								prefix = '\');' + line + ';';
								postfix = 'this.buffer.push(\'';
								state = STATE_SUBBLOK;
								break;
							default:
								prefix = '\');' + line + ';';
								postfix = ';this.buffer.push(\'';
								jsFromPos = 0;
							}
							switch (state) {
							case STATE_RAW:
								buffer.push(prefix, text.substr(jsFromPos).replace(trimExp, ''), postfix);
								break; 
							case STATE_TEXT:
								buffer.push(prefix, 'JustEscapeHtml('+text.substr(jsFromPos).replace(trimExp, '')+')', postfix);
								break;
							case STATE_CONDITION:
								tmp = text.substr(jsFromPos).replace(trimExp, '');
								if (!tmp.length) {
									buffer.push(prefix, '}', postfix);
								} else {
									buffer.push(prefix, 'if(', tmp, '){', postfix);
								}
								tmp = undefined;
								break;
							case STATE_ELSE:
								tmp = text.substr(jsFromPos).replace(trimExp, '');
								if (!tmp.length) {
									buffer.push(prefix, '{', postfix);
								} else {
									buffer.push(prefix, ' if(', tmp, '){', postfix);
								}
								tmp = undefined;
								break;
							case STATE_PARTIAL:
							case STATE_EXTEND:
								tmp = text.substr(jsFromPos).replace(trimExp, '').split(/\s+/);
								tmp = ['\'' + tmp[0] + '\'', tmp.splice(1).join(' ')];
								if (!tmp[1].length) {
									tmp = tmp[0];
								} else {
									tmp = tmp.join(',');
								}
								buffer.push(prefix, tmp, postfix);
								tmp = undefined;
								break;
							case STATE_LOOP:
								tmp = text.substr(jsFromPos).replace(trimExp, '').split(/\s+/);
								if (!tmp[0].length) {
									buffer.push('\');' + line + ';}, this);this.buffer.push(\'');
								} else {
									buffer.push(prefix, tmp[0], '.forEach(function(', tmp[1], '){this.buffer.push(\'');
								}
								tmp = undefined;
								break;
							case STATE_SUBBLOK:
								buffer.push(prefix, text.substr(jsFromPos).replace(trimExp, ''), postfix);
								break;
							}
						} else {
							buffer.push(text.replace(/[\\']/g, '\\$&').replace(/\r/g, ' ').replace(/\n/g, '\\n'));
						}
						lineNo += text.split(/\n/).length - 1;
					}
					buffer.push('\'); } } return this.buffer;');
					return buffer = buffer.join('');
                                },
				parse = function (html) {
					return new Function(parseToCode(html));
				},
				readSync = function (file) {
					var data = eval('(options.root.' + file + ')');
                                        if (Object.prototype.toString.call(data) === '[object String]') {
                                                return data;
                                        } else {
                                                console.error('Failed to load template', file)
                                                return '';
                                        }
				},
				loadSync = function (file) {
                                        var data = readSync(file)
                                        var blank = parse(data);
                                        return blank;
				},
				Template = function (file, data, customData) {
					this.file = file;
					if (Object.prototype.toString.call(options.root) === '[object String]') {
						this.file = path.normalize((options.root.length ? (options.root + '/') : '') + file + options.ext);
					}
					this.data = data;
					this.customData = customData || {};
					this.buffer = [];
					this.tmpBuffer = undefined;
					this.watcher = undefined;
					this.line = 1;
					this.partials = [];
					this.childData = [];
					this.childError = undefined;
					this.childCallback = undefined;
					this.callback = undefined;
					this.blocks = {};
				};
			Template.prototype.blockStart = function (name) {
				this.tmpBuffer = this.buffer;
				if (!this.blocks[name]) { this.blocks[name] = []; }
				if (!this.blocks[name].length) {
					this.buffer = this.blocks[name];
				} else {
					this.buffer = [];
				}
			};
			Template.prototype.blockEnd = function () {
				this.buffer = this.tmpBuffer;
				delete (this.tmpBuffer);
			};

                        // Включить результат рендера шаблона template с данными customData
			Template.prototype.partial = function (template, customData) {
				var  page = new Template(template, this.data, customData);
				return page.renderSync();
			};
			Template.prototype.partialWatch = function (v, data) { 
                                var template = data[0] 
                                var customData = data[1]
                                 
				var  page = new Template(template, customData, undefined);
				return page.renderSync(); 
			};
                        
                        
			Template.prototype.renderSync = function () {
				var that = this;

				var blank = loadSync(this.file)
                                try {
                                        var buffer = blank.call(that);
                                            for(var i = 0; i < that.partials.length; i++)
                                            {
                                                that.partials[i].call();
                                            }

                                            var html = '', length, i;
                                            for (i = 0, length = buffer.length; i < length; i++)
                                            {
                                                html += (Array.isArray(buffer[i])) ? buffer[i].join('') : buffer[i];
                                            }
                                            return html;
                                } catch (e) {
                                        console.warn(e.message + ' in ' + that.file + ' on line ' + that.line);
                                        return;
                                }
			};

			this.configure = function (newOptions) {
				var option;
				newOptions = newOptions || {};
				for (option in options) {
					options[option] = newOptions[option] || options[option];
				}
			};
			this.renderSync = function (template, data)
                        {
                            if(data === undefined)
                            {
                                data = {}
                            }

                            if(this.record)
                            {
                                this.testrecord.push({
                                    template:template,
                                    data:data
                                })
                            }

                            var tpl = new Template(template, data);
                            var html = tpl.renderSync();
                            if(html == undefined)
                            {
                                console.warn("renderSync error", template, data)
                            }
                            return html;
			};
			this.render = this.renderSync
                        // Начинает сохранение данных о отрисовываемых шаблонов
			this.startRecoding = function ()
                        {
                            this.record = true;
                            this.testrecord = []
                        }

                        // Возвращяет данные о отрисованых шаблонах
			this.getRecoding = function ()
                        {
                            return this.testrecord
                        }

                        // Заканчивает сохранение данных о отрисовываемых шаблонов
			this.stopRecoding = function ()
                        {
                            this.record = false;
                        }

                        // Берёт результат записи данных из getRecoding и прогоняет рендер ещё раз
                        // Если возникнут ошибки то выведет их вконсоль
                        // Удобно использовать для автоматизации проверки валидности шаблонов и передаваемых в них данных.
			this.testRecoding = function (record)
                        {
                            var tmp = this.record;
                            this.record = false;

                            for(var i in record)
                            {
                                console.log(i, record[i].template);
                                var res = this.renderSync(record[i].template, record[i].data)
                                if(!res)
                                {
                                    console.error(i, record[i].template, record[i].data);
                                }

                            }
                            this.record = tmp;
                        }

			this.configure(newOptions);
		};

		if (!Array.prototype.filter) {
			Array.prototype.filter = function (fun, thisp) {
				var
					len = this.length,
					res = [],
					i,
					val;
				if (typeof fun !== 'function') { throw new TypeError(); }
				for (i = 0; i < len; i++) {
					if (i in this) {
						val = this[i];
						if (fun.call(thisp, val, i, this)) { res.push(val); }
					}
				}
				return res;
			};
		}
		if (!Array.prototype.forEach) {
			Array.prototype.forEach = function (fun, thisp) {
				var
					len = this.length,
					i;
				if (typeof fun !== 'function') { throw new TypeError(); }
				for (i = 0; i < len; i++) {
					if (i in this) {
						fun.call(thisp, this[i], i, this);
					}
				}
			};
		}
		if (!Array.isArray) {
			Array.isArray = function (obj) {
				return Object.prototype.toString.call(obj) === '[object Array]';
			};
		}

		var cbSplit;

		if (!cbSplit) {
			cbSplit = function (str, separator, limit) {
				if (Object.prototype.toString.call(separator) !== '[object RegExp]') {
					return cbSplit.nativeSplit.call(str, separator, limit);
				}
				var
					output = [],
					lastLastIndex = 0,
					flags = (separator.ignoreCase ? 'i' : '') +
					(separator.multiline  ? 'm' : '') +
					(separator.sticky     ? 'y' : ''),
					separator2, match, lastIndex, lastLength;

				separator = new RegExp(separator.source, flags + 'g');

				str = str + '';

				if (!cbSplit.compliantExecNpcg) {
					separator2 = new RegExp('^' + separator.source + '$(?!\\s)', flags);
				}

				if (limit === undefined || +limit < 0) {
					limit = Infinity;
				} else {
					limit = Math.floor(+limit);
					if (!limit) {
						return [];
					}
				}

				while (match = separator.exec(str)) {
					lastIndex = match.index + match[0].length;
					if (lastIndex > lastLastIndex) {
						output.push(str.slice(lastLastIndex, match.index));

						if (!cbSplit.compliantExecNpcg && match.length > 1) {
							match[0].replace(separator2, function () {
								var i;
								for (i = 1; i < arguments.length - 2; i++) {
									if (arguments[i] === undefined) {
										match[i] = undefined;
									}
								}
							});
						}

						if (match.length > 1 && match.index < str.length) {
							Array.prototype.push.apply(output, match.slice(1));
						}

						lastLength = match[0].length;
						lastLastIndex = lastIndex;

						if (output.length >= limit) {
							break;
						}
					}

					if (separator.lastIndex === match.index) {
						separator.lastIndex++;
					}
				}

				if (lastLastIndex === str.length) {
					if (lastLength || !separator.test('')) {
						output.push('');
					}
				} else {
					output.push(str.slice(lastLastIndex));
				}

				return output.length > limit ? output.slice(0, limit) : output;
			};

			cbSplit.compliantExecNpcg = /()??/.exec('')[1] === undefined;
			cbSplit.nativeSplit = String.prototype.split;
		}

		String.prototype.split = function (separator, limit) {
			return cbSplit(this, separator, limit);
		};

		window.JUST = JUST;
}());


function JustEscapeHtml(text) {
  var map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
   
  if(!text || !text.replace)
  {
      return text;
  }
  return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}