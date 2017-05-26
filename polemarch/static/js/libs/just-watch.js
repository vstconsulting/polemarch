/*
 * https://gist.github.com/eligrey/384583
 *
 *
 * object.watch polyfill
 *
 * 2012-04-03
 *
 * By Eli Grey, http://eligrey.com
 * Public Domain.
 * NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.
 */

// object.watch
if (!Object.prototype.watch) {
	Object.defineProperty(Object.prototype, "watch", {
		  enumerable: false
		, configurable: true
		, writable: false
		, value: function (prop, handler) {
			var
			  oldval = this[prop]
			, newval = oldval
			, getter = function () {
				return newval;
			}
			, setter = function (val) {
				oldval = newval;
				return newval = handler.call(this, prop, oldval, val);
			}
			;

			if (delete this[prop]) { // can't watch constants
				Object.defineProperty(this, prop, {
					  get: getter
					, set: setter
					, enumerable: true
					, configurable: true
				});
			}
		}
	});
}

// object.unwatch
if (!Object.prototype.unwatch) {
	Object.defineProperty(Object.prototype, "unwatch", {
		  enumerable: false
		, configurable: true
		, writable: false
		, value: function (prop) {
			var val = this[prop];
			delete this[prop]; // remove accessors
			this[prop] = val;
		}
	});
}


/*!
 * https://github.com/unclechu/node-deep-extend/blob/master/lib/deep-extend.js
 *
 *
 * @description Recursive object extending
 * @author Viacheslav Lotsmanov <lotsmanov89@gmail.com>
 * @license MIT
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2013-2015 Viacheslav Lotsmanov
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
function isSpecificValue(val) {
	return (
		val instanceof Buffer
		|| val instanceof Date
		|| val instanceof RegExp
	) ? true : false;
}

function cloneSpecificValue(val) {
	if (val instanceof Buffer) {
		var x = new Buffer(val.length);
		val.copy(x);
		return x;
	} else if (val instanceof Date) {
		return new Date(val.getTime());
	} else if (val instanceof RegExp) {
		return new RegExp(val);
	} else {
		throw new Error('Unexpected situation');
	}
}

/**
 * Recursive cloning array.
 */
function deepCloneArray(arr) {
	var clone = [];
	arr.forEach(function (item, index) {
		if (typeof item === 'object' && item !== null) {
			if (Array.isArray(item)) {
				clone[index] = deepCloneArray(item);
			} else if (isSpecificValue(item)) {
				clone[index] = cloneSpecificValue(item);
			} else {
				clone[index] = deepExtend({}, item);
			}
		} else {
			clone[index] = item;
		}
	});
	return clone;
}

/**
 * Extening object that entered in first argument.
 *
 * Returns extended object or false if have no target object or incorrect type.
 *
 * If you wish to clone source object (without modify it), just use empty new
 * object as first argument, like this:
 *   deepExtend({}, yourObj_1, [yourObj_N]);
 */
var deepExtend = function (/*obj_1, [obj_2], [obj_N]*/) {
    if (arguments.length < 1 || typeof arguments[0] !== 'object') {
            return false;
    }

    if (arguments.length < 2) {
            return arguments[0];
    }

    var target = arguments[0];

    // convert arguments to array and cut off target object
    var args = Array.prototype.slice.call(arguments, 1);

    var val, src, clone;

    args.forEach(function (obj) {
            // skip argument if it is array or isn't object
            if (typeof obj !== 'object' || Array.isArray(obj)) {
                    return;
            }

            Object.keys(obj).forEach(function (key) {
                    src = target[key]; // source value
                    val = obj[key]; // new value

                    // recursion prevention
                    if (val === target) {
                            return;

                    /**
                     * if new value isn't object then just overwrite by new value
                     * instead of extending.
                     */
                    } else if (typeof val !== 'object' || val === null) {
                            target[key] = val;
                            return;

                    // just clone arrays (and recursive clone objects inside)
                    } else if (Array.isArray(val)) {
                            target[key] = deepCloneArray(val);
                            return;

                    // custom cloning and overwrite for specific objects
                    } else if (isSpecificValue(val)) {
                            target[key] = cloneSpecificValue(val);
                            return;

                    // overwrite by new value if source isn't object or array
                    } else if (typeof src !== 'object' || src === null || Array.isArray(src)) {
                            target[key] = deepExtend({}, val);
                            return;

                    // source value and new value is objects both, extending...
                    } else {
                            target[key] = deepExtend(src, val);
                            return;
                    }
            });
    });

    return target;
}


/**
 * Добавлят односторонеею связаность шаблоноа и данных при вставке в любое место DOM страницы
 *
 * Примеры вызова в рамках JUST.js
 *
 * Подстановка без фильтрации
 * <%= anyObject.justHtml('anyValue') %>
 * <%= anyObject.justHtml('anyValue', function(v){return (v+"").replace("a", "D") }) %>
 *
 * Подстановка текста
 * <%= anyObject.justText('host_url') %>
 * <%= anyObject.justText('anyValue', function(v){return (v+"").replace("a", "G") }) %>
 *
 * Подстановка класса если знаение не false
 * <h1 class="<%= anyObject.justClass('anyValue', 'anyClassName') %> " >Any text</h1>
 * 
 * Подстановка атрибута 
 * <h1 <%= anyObject.justAttr('anyValue', 'data-test') %> >Any text</h1>
 * <h1 <%= anyObject.justAttr('anyValue', 'data-test', function(v){return (v+"").replace("a", "G") }) %> >Any text</h1>
 * 
 */ 
if (!Object.prototype.justHtml)
{
    var justWatch = {
        
        justStrip:function(html)
        {
           var tmp = document.createElement("DIV");
           tmp.innerHTML = html;
           return tmp.textContent || tmp.innerText || "";
        },
        
        addMethod:function(setter, prop, method)
        {
            Object.defineProperty(this[prop], method, {
                    enumerable: false
                  , configurable: true
                  , writable: true
                  , value: function(){
                      console.log("watch method", method, arguments);
                      Array.prototype[method].apply(this, arguments);
                      setter.apply(this,["__justWatch_update"]);
                      return this; 
                  }
            }); 
        },
        
        _just_Id:0,  
        
        methods:['pop',
            'push',
            'reduce',
            'reduceRight',
            'reverse',
            'shift',
            'slice',
            'some',
            'sort',
            'splice',
            'unshift',
            'unshift'
        ],
        
        setValue:function (opt)
        {
            /*
             * Методы массивов применяем для реактивности массива
             */
            justWatch._just_Id++;
            var id = justWatch._just_Id;

            if(!opt.callBack)
            {
                opt.callBack = function(val){ return val;}
            }

            var thisObj = this[opt.prop]
            this[opt.prop] = "__justWatch_test";

            if( this[opt.prop] === "__justWatch_test")
            {
                this[opt.prop] = thisObj
                var newval = {
                    val:this[opt.prop],
                    just_ids:[{id:id, callBack:opt.callBack, type:opt.type, className:opt.className, attrName:opt.attrName, customData:opt.customData}],
                }

                if (delete this[opt.prop])
                {
                    var getter = function ()
                    {
                        return newval.val;
                    }

                    var setter = function (val)
                    {
                        if(val && val == "__justWatch_test")
                        {
                            return val;
                        }

                        if(val &&  val.__add_justHtml_test === "__justWatch_test")
                        {
                            console.log("setter add", newval);
                            newval.just_ids.push({
                                id:val.id,
                                attrName:val.attrName,
                                callBack:val.callBack,
                                className:val.className,
                                customData:val.customData,
                                type:val.type
                            })
                            return val;
                        }

                        if(val && val !== "__justWatch_update")
                        {
                            newval.val = val;

                            if(Array.isArray(val))
                            {
                                for(var i in justWatch.methods)
                                {
                                    justWatch.addMethod.apply(this, [setter, opt.prop, justWatch.methods[i]])
                                } 
                            }
                        }

                        console.log("setter", newval);
                        for(var i in newval.just_ids)
                        {
                            if(newval.just_ids[i].type == 'innerHTML')
                            {
                                var el = document.getElementById("_justWatch"+newval.just_ids[i].id)
                                if(el) el.innerHTML = newval.just_ids[i].callBack(val, newval.just_ids[i].customData)
                            }
                            else if(newval.just_ids[i].type == 'textContent')
                            {
                                var el = document.getElementById("_justWatch"+newval.just_ids[i].id)
                                if(el) el.textContent = newval.just_ids[i].callBack(val, newval.just_ids[i].customData)
                            }
                            else if(newval.just_ids[i].type == 'class')
                            {
                                var el = document.getElementsByClassName("just-watch-class-"+newval.just_ids[i].id)

                                var valT = newval.just_ids[i].callBack(val, newval.just_ids[i].customData) 
                                console.log("class", valT)
                                if(!valT)
                                {
                                    if(el && el.length)
                                        el[0].className = el[0].className
                                            .replace(new RegExp("^"+newval.just_ids[i].className+"$","g"), "")
                                            .replace(new RegExp(" +"+newval.just_ids[i].className+" +","g"), " ")
                                            .replace(new RegExp(" +"+newval.just_ids[i].className+"$","g"), "")
                                }
                                else
                                {
                                    if(el && el.length)
                                        el[0].className = el[0].className
                                            .replace(new RegExp("^"+newval.just_ids[i].className+"$","g"), "")
                                            .replace(new RegExp(" +"+newval.just_ids[i].className+" +","g"), " ")
                                            .replace(new RegExp(" "+newval.just_ids[i].className+"$","g"), "")
                                            + " " + newval.just_ids[i].className
                                }
                            }
                            else if(newval.just_ids[i].type == 'attr')
                            {
                                var el = document.querySelectorAll("[data-just-watch-"+newval.just_ids[i].id+"]");
                                if(el && el.length)
                                {
                                    var attrVal = newval.just_ids[i].callBack(val, newval.just_ids[i].customData)
                                    if(attrVal)
                                    {
                                        el[0].setAttribute(newval.just_ids[i].attrName, attrVal);
                                    }
                                    else
                                    {
                                        el[0].removeAttribute(newval.just_ids[i].attrName);
                                    }
                                }
                            }
                        }
                        return val;
                    }

                    // can't watch constants
                    Object.defineProperty(this, opt.prop, {
                              get: getter
                            , set: setter
                            , enumerable: true
                            , configurable: true
                    });

                    if(Array.isArray(newval.val))
                    { 
                        for(var i in justWatch.methods)
                        {
                            justWatch.addMethod.apply(this, [setter, opt.prop, justWatch.methods[i]])
                        } 
                    }
                }
            }
            else
            {
                this[opt.prop] = {
                    __add_justHtml_test:"__justWatch_test",
                    id:id,
                    type:opt.type,
                    callBack:opt.callBack,
                    attrName:opt.attrName,
                    className:opt.className,
                    customData:opt.customData
                }
            }

            if(opt.type == 'innerHTML')
            {
                return "<div id='_justWatch"+id+"' class='just-watch just-watch-html' style='display: inline;' >"+opt.callBack(this[opt.prop], opt.customData)+"</div>";
            }
            else if(opt.type == 'textContent')
            { 
                return "<div id='_justWatch"+id+"' style='display: inline;' class='just-watch just-watch-text' >"+justWatch.justStrip(opt.callBack(this[opt.prop], opt.customData))+"</div>";
            }
            else if(opt.type == 'class')
            {
                var val = opt.callBack(this[opt.prop], opt.customData)
                if(val)
                {
                    return " just-watch just-watch-class just-watch-class-"+id+" "+justWatch.justStrip(opt.className)+" ";
                }
                else
                {
                    return " just-watch just-watch-class just-watch-class-"+id+" ";
                }
            }
            else if(opt.type == 'attr')
            {
                var val = opt.callBack(this[opt.prop], opt.customData)
                if(val)
                {
                    return " data-just-watch-"+id+" "+opt.attrName+"=\""+ justWatch.justStrip(val).replace(/\"/g, "\\\"") +"\"";
                }
                else
                {
                    return " data-just-watch-"+id+" ";
                }
            }

            return opt.callBack(this[opt.prop], opt.customData)
        }

    } 
 
    // Проставляет html код значения
    Object.defineProperty(Object.prototype, "justHtml", {
        enumerable: false
      , configurable: true
      , writable: false
      , value: function(prop, callBack, customData){ return justWatch.setValue.apply(this, [{type:'innerHTML', prop:prop, callBack:callBack, customData:customData}])
      }
    });
 
    // Проставляет text значения
    Object.defineProperty(Object.prototype, "justText", {
        enumerable: false
      , configurable: true
      , writable: false
      , value: function(prop, callBack, customData){ return justWatch.setValue.apply(this, [{type:'textContent', prop:prop, callBack:callBack, customData:customData}])}
    });

    // Проставляет css class
    Object.defineProperty(Object.prototype, "justClass", {
        enumerable: false
      , configurable: true
      , writable: false
      , value: function(prop, className, callBack, customData)
        { 
            return justWatch.setValue.apply(this, [{
                    type:'class',
                    prop:prop,
                    className:className,
                    callBack:callBack,
                    customData:customData
                }])
        }
    });

    // Проставляет атрибут
    Object.defineProperty(Object.prototype, "justAttr", {
        enumerable: false
      , configurable: true
      , writable: false
      , value: function(prop, attrName, callBack, customData){ return justWatch.setValue.apply(this, [{type:'attr', prop:prop, callBack:callBack, attrName:attrName, customData:customData}])}
    });
}

if (!Object.prototype.getBy)
{
    Object.defineProperty(Object.prototype, "getBy", {
        enumerable: false
      , configurable: true
      , writable: false
      , value: function(prop, value)
      {
            for(var i in this)
            {
                var val = this[i];
                if(val[prop] == value)
                {
                    return this[i];
                }
            }
      }
    });
}

// deepExtend