$( document ).ready(function() {
    console.log( "Document is ready!" );

    var headings = $('.toctree-l1');

    for(var i=0; i<headings.length; i++)
    {
        console.log(headings[i].children[0].innerText);
        var t = headings[i].children[0].innerText;
        $($('.toctree-l1')[i].children[0]).empty();
        $($('.toctree-l1')[i].children[0]).prepend('<i class="fa fa-book doc-sidebar-icon"></i>');
        $($('.toctree-l1')[i].children[0]).append('<span class="docs-heading-wrapper"><span class="docs-heading">' + t + '</span></span>');

    }


    $(".toctree-l1 .reference.internal").mouseenter(function () {
        var thisEl = this;
        setTimeout(function () {
            var docsHeadings = $(".docs-heading-wrapper");
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
                $(".docs-heading-wrapper-visible").removeClass("docs-heading-wrapper-visible");
                $(thisEl).children('span').addClass('docs-heading-wrapper-visible');
            }
        }, 200);

        $(".content-wrapper").hover(function ()
        {
            $(".docs-heading-wrapper-visible").removeClass("docs-heading-wrapper-visible");
        })

        $(".navbar").hover(function ()
        {
            $(".docs-heading-wrapper-visible").removeClass("docs-heading-wrapper-visible");
        })
    })


    console.log(headings);
});