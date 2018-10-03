$( document ).ready(function() {

    var headings = $('.sidebar-menu .toctree-l1');

    for(var i=0; i<headings.length; i++)
    {
        var t = headings[i].children[0].innerText;
        $($('.toctree-l1')[i].children[0]).empty();
        $($('.toctree-l1')[i].children[0]).prepend('<i class="fa fa-book doc-sidebar-icon"></i>');
        $($('.toctree-l1')[i].children[0]).append('<span class="docs-heading-wrapper"><span class="docs-heading">' + t + '</span></span>');
    }

    $(".sidebar-menu .toctree-l1 .reference.internal").mouseenter(function () {
        var thisEl = this;
            var docsHeadings = $(".sidebar-menu .docs-heading-wrapper");
            var bool = false;
            for(var i=0; i<docsHeadings.length; i++)
            {
                if($(docsHeadings[i]).is(':hover'))
                {
                    bool = true;
                }
            }

            if(bool==false)
            {
                $(".sidebar-menu .docs-heading-wrapper-visible").removeClass("docs-heading-wrapper-visible");
                $(thisEl).children('span').addClass('docs-heading-wrapper-visible');
            }
    })

    $(".content-wrapper").hover(function ()
    {
        $(".sidebar-menu .docs-heading-wrapper-visible").removeClass("docs-heading-wrapper-visible");
    })

    $(".navbar").hover(function ()
    {
        $(".sidebar-menu .docs-heading-wrapper-visible").removeClass("docs-heading-wrapper-visible");
    })

    if(guiLocalSettings.get('hideMenu'))
    {
        $('body').addClass('sidebar-collapse');
    }
});
