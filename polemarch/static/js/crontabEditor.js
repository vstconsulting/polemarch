

function crontabEditor(){

}

crontabEditor.model = {}

crontabEditor.model.MonthsNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
crontabEditor.model.DaysOfWeekNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

crontabEditor.model.Months = {}
crontabEditor.model.DayOfMonth = {}
crontabEditor.model.DaysOfWeek = {}
crontabEditor.model.Hours = {}
crontabEditor.model.Minutes = {}

crontabEditor.model.MonthsStr = "*"
crontabEditor.model.DayOfMonthStr = "*"
crontabEditor.model.DaysOfWeekStr = "*"
crontabEditor.model.HoursStr = "*"
crontabEditor.model.MinutesStr = "*"

crontabEditor.model.string = "* * * * *";

crontabEditor.editor = function(options)
{
    if(!options)
    {
        options = {};
    }

    if(!options.string)
    {
        options.string = "* * * * *";
    }

    crontabEditor.model.string = options.string;
    crontabEditor.parseCronString()
    return spajs.just.render('crontabEditor', {options:options})
}

crontabEditor.parseCronString = function(string)
{
    if(string !== undefined)
    {
        crontabEditor.model.string = string
    }

    var string = trim(crontabEditor.model.string).split(" ");
    if(string.length != 5)
    {
        crontabEditor.model.string = "* * * * *";
    }

    crontabEditor.model.MinutesStr = string[0]
    crontabEditor.model.HoursStr = string[1]
    crontabEditor.model.DayOfMonthStr = string[2]
    crontabEditor.model.MonthsStr = string[3]
    crontabEditor.model.DaysOfWeekStr = string[4]

    crontabEditor.parseItem(crontabEditor.model.Minutes, crontabEditor.model.MinutesStr, 0, 59)
    crontabEditor.parseItem(crontabEditor.model.Hours, crontabEditor.model.HoursStr, 0, 23)
    crontabEditor.parseItem(crontabEditor.model.DayOfMonth, crontabEditor.model.DayOfMonthStr, 1, 31)
    crontabEditor.parseItem(crontabEditor.model.Months, crontabEditor.model.MonthsStr, 1, 12)
    crontabEditor.parseItem(crontabEditor.model.DaysOfWeek, crontabEditor.model.DaysOfWeekStr, 0, 6)

}

crontabEditor.setDaysOfWeek = function(value)
{
    crontabEditor.model.string = crontabEditor.model.string.replace(/^([^ ]+) +([^ ]+) +([^ ]+) +([^ ]+) +([^ ]+)/img, '$1 $2 $3 $4 '+value); 
    crontabEditor.parseCronString();
    crontabEditor.updateCronString();
}

crontabEditor.setMonths = function(value)
{
     crontabEditor.model.string = crontabEditor.model.string.replace(/^([^ ]+) +([^ ]+) +([^ ]+) +([^ ]+) +([^ ]+)/img, '$1 $2 $3 '+value+' $5'); 
     crontabEditor.parseCronString(); 
     crontabEditor.updateCronString();
}

crontabEditor.setDayOfMonth = function(value)
{
    crontabEditor.model.string = crontabEditor.model.string.replace(/^([^ ]+) +([^ ]+) +([^ ]+) +([^ ]+) +([^ ]+)/img, '$1 $2 '+value+' $4 $5');
    crontabEditor.parseCronString();
    crontabEditor.updateCronString();
}

crontabEditor.setHours = function(value)
{
    crontabEditor.model.string = crontabEditor.model.string.replace(/^([^ ]+) +([^ ]+) +([^ ]+) +([^ ]+) +([^ ]+)/img, '$1 '+value+' $3 $4 $5'); 
    crontabEditor.parseCronString(); 
    crontabEditor.updateCronString();
}

crontabEditor.setMinutes = function(value)
{
    crontabEditor.model.string = crontabEditor.model.string.replace(/^([^ ]+) +([^ ]+) +([^ ]+) +([^ ]+) +([^ ]+)/img, value+' $2 $3 $4 $5'); 
    crontabEditor.parseCronString(); 
    crontabEditor.updateCronString();
}

/**
 * Парсит отдельный элемент в cron строке
 * @param {type} resArr
 * @param {type} str
 * @param {type} minInt
 * @param {type} maxInt
 * @returns {Array}
 */
crontabEditor.parseItem = function(resArr, str, minInt, maxInt)
{
    for(var i=minInt; i< maxInt; i++)
    {
        resArr[i] = false;
    }

    for(var i in resArr)
    {
        resArr[i] = false;
    }

    if(!str)
    {
        str = "*";
    }

    var Parts = str.split(",")
    for(var i in Parts)
    {
        if(/^\*$/.test(Parts[i]))
        {
            if(minInt < maxInt)
            {
                for(var j = minInt; j <= maxInt; j++)
                {
                    resArr[j] = true
                }
            }
        }
        else if(/^\*\/([0-9]+)$/.test(Parts[i]))
        {
            var match = /^\*\/([0-9]+)$/.exec(Parts[i])
            if(minInt < maxInt && match[1]/1 >= 1)
            {
                for(var j = minInt; j <= maxInt; j+= match[1]/1)
                {
                    resArr[j] = true
                }
            }
        }
        else if(/^([0-9]+)-([0-9]+)$/.test(Parts[i]))
        {
            var match = /^([0-9]+)-([0-9]+)$/.exec(Parts[i])
            if(match[1]/1 > maxInt)
            {
                match[1] = minInt
            }
            if(match[2]/1 > maxInt)
            {
                match[2] = maxInt
            }

            if(match[1]/1 < match[2]/1)
            {
                for(var j = match[1]/1; j <= match[2]/1; j++)
                {
                    resArr[j] = true
                }
            }
        }
        else if(/^([0-9]+)$/.test(Parts[i]))
        {
            if(Parts[i]/1 <= maxInt && Parts[i]/1 >= minInt)
            {
                resArr[Parts[i]/1] = true
            }
        }
        else if(/^([0-9]+)\/([0-9]+)$/.test(Parts[i]))
        {
            var match = /^([0-9]+)\/([0-9]+)$/.exec(Parts[i])
            if(match[1]/1 > maxInt)
            {
                match[1] = minInt
            }
            if(match[1]/1 < maxInt && match[2]/1 >= 1)
            {
                for(var j = match[1]/1; j <= maxInt; j+=match[2]/1)
                {
                    resArr[j] = true
                }
            }
        }
        else if(/^([0-9]+)-([0-9]+)\/([0-9]+)$/.test(Parts[i]))
        {
            var match = /^([0-9]+)-([0-9]+)\/([0-9]+)$/.exec(Parts[i])
            if(match[1]/1 > maxInt)
            {
                match[1] = minInt
            }
            if(match[2]/1 > maxInt)
            {
                match[2] = maxInt
            }

            if(match[1]/1 < match[2]/1 && match[3]/1 >= 1)
            {
                for(var j = match[1]/1; j <= match[2]/1; j+=match[3]/1)
                {
                    resArr[j] = true
                }
            }
        }
    }



    return resArr;
}

crontabEditor.getCronString = function()
{
    crontabEditor.updateCronString()
    return crontabEditor.model.string;
}


crontabEditor.compileItem = function(resArr, minInt, maxInt)
{
    var itemResults = []
    itemResults.push(resArr.join(","))
    if(!resArr || !resArr.length || resArr.length == maxInt - minInt + 1)
    {
        return "*";
    }

    if(resArr.length)
    {
        var division = [];
        for(var j=2; j<maxInt/2; j++)
        {
            var isInner = false
            for(var k in division)
            {
                if(j % division[k] == 0)
                {
                    isInner = true;
                }
            }

            if(isInner)
            {
                continue;
            }

            var isOk = true
            for(var i=minInt; i<maxInt; i+=j)
            {
                if(resArr.indexOf(i) == -1)
                {
                    isOk = false;
                    break;
                }
            }

            if(isOk)
            {
                division.push(j);
            }
        }

        var exclude = []
        var includeParts = []
        for(var i in division)
        {
            for(var j=minInt; j<maxInt; j+=division[i])
            {
                exclude.push(j)
            }
            includeParts.push("*/"+division[i])
        }

        var lastVal = -1;
        var range = [];

        for(var i in resArr)
        {
            if(exclude.indexOf(resArr[i]) != -1)
            {
                continue;
            }

            if(lastVal + 1 == resArr[i] )
            {
                range.push(resArr[i])
            }
            else
            {
                if(range.length > 2)
                {
                    includeParts.push(range[0] + "-" + range[range.length-1])
                }
                else if(range.length)
                {
                    for(var l in range)
                    {
                        includeParts.push(range[l])
                    }
                }
                range = [resArr[i]]
            }

            lastVal = resArr[i]
        }

        if(range.length > 2)
        {
            includeParts.push(range[0] + "-" + range[range.length-1])
        }
        else if(range.length)
        {
            for(var l in range)
            {
                includeParts.push(range[l])
            }
        }
        itemResults.push(includeParts.join(","))
    }

    if(resArr.length)
    {
        var lastVal = -1;
        var includeParts = []
        var range = []
        for(var i in resArr)
        {
            if(lastVal + 1 == resArr[i] )
            {
                range.push(resArr[i])
            }
            else
            {
                if(range.length > 2)
                {
                    includeParts.push(range[0] + "-" + range[range.length-1])
                }
                else if(range.length)
                {
                    for(var l in range)
                    {
                        includeParts.push(range[l])
                    }
                }
                range = [resArr[i]]
            }

            lastVal = resArr[i]
        }

        if(range.length > 2)
        {
            includeParts.push(range[0] + "-" + range[range.length-1])
        }
        else if(range.length)
        {
            for(var l in range)
            {
                includeParts.push(range[l])
            }
        }

        itemResults.push(includeParts.join(","))
    }

    var minLength = 99999;
    var minLengthResult = "";
    for(var i in itemResults)
    {
        if(itemResults[i].length < minLength )
        {
            minLength = itemResults[i].length
            minLengthResult = itemResults[i]
        }
    }

    return minLengthResult;
}

crontabEditor.updateCronString = function()
{
    //
    // DaysOfWeek
    //
    var DaysOfWeek = []
    for(var i in crontabEditor.model.DaysOfWeek)
    {
        if(crontabEditor.model.DaysOfWeek[i])
        {
            DaysOfWeek.push(i/1);
        }
    }
    crontabEditor.model.DaysOfWeekStr = this.compileItem(DaysOfWeek, 0, 6);

    //
    // Months
    //
    var Months = []
    for(var i in crontabEditor.model.Months)
    {
        if(crontabEditor.model.Months[i])
        {
            Months.push(i/1);
        }
    }
    crontabEditor.model.MonthsStr = this.compileItem(Months, 1, 12);

    //
    // DayOfMonth
    //
    var DayOfMonth = []
    for(var i in crontabEditor.model.DayOfMonth)
    {
        if(crontabEditor.model.DayOfMonth[i])
        {
            DayOfMonth.push(i/1);
        }
    }
    crontabEditor.model.DayOfMonthStr = this.compileItem(DayOfMonth, 1, 31);

    //
    // Hours
    //
    var Hours = []
    for(var i in crontabEditor.model.Hours)
    {
        if(crontabEditor.model.Hours[i])
        {
            Hours.push(i/1);
        }
    }
    crontabEditor.model.HoursStr = this.compileItem(Hours, 0, 23);

    //
    // Minutes
    //
    var Minutes = []
    for(var i in crontabEditor.model.Minutes)
    {
        if(crontabEditor.model.Minutes[i])
        {
            Minutes.push(i/1);
        }
    }
    crontabEditor.model.MinutesStr = this.compileItem(Minutes, 0, 59);

    crontabEditor.model.string =  crontabEditor.model.MinutesStr
                                    + " " + crontabEditor.model.HoursStr
                                    + " " + crontabEditor.model.DayOfMonthStr
                                    + " " + crontabEditor.model.MonthsStr
                                    + " " + crontabEditor.model.DaysOfWeekStr;

    $("#crontabEditorString").val(crontabEditor.model.string)
}
