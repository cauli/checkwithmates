/**
 * Created by caulitomaz on 13/01/15.
 */

// We are setting a few options for our chart and override the defaults
var options = {
    showPoint: true,
    // Disable line smoothing
    lineSmooth: false,
    // X-Axis specific configuration
    axisX: {
        // We can disable the grid for this axis
        showGrid: true,
        // and also don't show the label
        showLabel: false
    },
    // Y-Axis specific configuration
    axisY: {
        // Lets offset the chart a bit from the labels
        offset: 40,
        // The label interpolation function enables you to modify the values
        // used for the labels on each axis. Here we are converting the
        // values into million pound.
        labelInterpolationFnc: function(value) {
            return '' + value + '';
        }
    },
    // Specify a fixed height for the chart as a string (i.e. '100px' or '50%')
    height: '190px'
};


new Chartist.Line('.ct-chart', {
    labels: ['0','0','0','0','0','0'],
    series: [
        {
            name: ' ',
            data: ['0','0','0','0','0','0']
        }
    ]
}, options);


$( document ).ready(function() {

    $.ajax({
        type: 'GET',
        contentType: 'application/json',
        url: $URL + '/profile/'+name+'/rating',
        success: function(data) {

            $('.ct-chart').empty();

            new Chartist.Line('.ct-chart', {
                labels: data,
                series: [
                    {
                        name: ' ',
                        data: data
                    }
                ]
            }, options);

            prepareChart();
        }
    });
});

var easeOutQuad = function (x, t, b, c, d) {
    return -c * (t /= d) * (t - 2) + b;
};

var $chart = $('.ct-chart');

var $toolTip = $chart
    .append('<div class="tooltip"></div>')
    .find('.tooltip')
    .hide();


function prepareChart()
{
    $chart.on('mouseenter', '.ct-point', function() {
        var $point = $(this),
            value = $point.attr('ct:value'),
            seriesName = $point.parent().attr('ct:series-name');

        $point.animate({'stroke-width': '17px'}, 300, easeOutQuad);
        $toolTip.html(seriesName + '<br>' + value).show();
    });

    $chart.on('mouseleave', '.ct-point', function() {
        var $point = $(this);

        $point.animate({'stroke-width': '10px'}, 300, easeOutQuad);
        $toolTip.hide();
    });

    $chart.on('mousemove', function(event) {
        $toolTip.css({
            left: (event.offsetX || event.originalEvent.layerX) - $toolTip.width() / 2 - 10,
            top: (event.offsetY || event.originalEvent.layerY) - $toolTip.height() - 40
        });
    });
}
