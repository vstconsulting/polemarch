function loadQUnitTests()
{
    
    $('body').append('<script src=\'' + window.pmStaticPath + 'js/tests/qUnitTest.js\'></script>');  
    
    var intervaId = setInterval(function()
    {
        if(window.injectQunit !== undefined)
        {
            clearInterval(intervaId)
            injectQunit()
        } 
    }, 1000)
}