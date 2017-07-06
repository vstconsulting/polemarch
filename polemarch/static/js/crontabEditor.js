 

function crontabEditor(){
    
}

crontabEditor.editor = function(string, options)
{ 
    return spajs.just.render('crontabEditor', {cronstring:string, options:options}) 
}
