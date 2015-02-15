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
    height: '195px'
};

var donutOptions = {
  donut: true,
  donutWidth: 19,
  startAngle: 0,
  total: 0,
  showLabel: true,
  height:'195px',
  width: '195px'
}

new Chartist.Line('#line-graph', {
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

            $('#line-graph').empty();

            new Chartist.Line('#line-graph', {
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


    $.ajax({
        type: 'GET',
        contentType: 'application/json',
        url: $URL + '/profile/'+name+'/results',
        success: function(data) {

            if(data.all.won == 0 && data.all.won == 0 && data.all.won == 0)
            {
                new Chartist.Pie('#left-chart.ct-chart', {
                  labels: ['' + data.all.won, '' + data.all.lost, ''+data.all.drawn],
                  series: [data.all.won+1,data.all.lost+1,data.all.drawn+1]
                }, donutOptions);
            }
            else
            {
                new Chartist.Pie('#left-chart.ct-chart', {
                  labels: ['' + data.all.won, '' + data.all.lost, ''+data.all.drawn],
                  series: [data.all.won,data.all.lost,data.all.drawn]
                }, donutOptions);
            }
      
            if(data.white.won == 0 && data.white.won == 0 && data.white.won == 0)
            {
                new Chartist.Pie('#middle-chart.ct-chart', {
                  labels: ['' + data.white.won, '' + data.white.lost, '' + data.white.drawn],
                  series: [data.white.won+1,data.white.lost+1,data.white.drawn+1]
                }, donutOptions);
            }
            else
            {
                new Chartist.Pie('#middle-chart.ct-chart', {
                  labels: ['' + data.white.won, '' + data.white.lost, '' + data.white.drawn],
                  series: [data.white.won,data.white.lost,data.white.drawn]
                }, donutOptions);
            }

            if(data.black.won == 0 && data.black.won == 0 && data.black.won == 0)
            {
                new Chartist.Pie('#right-chart.ct-chart', {
                  labels: ['' +data.black.won, '' +data.black.lost , '' + data.black.drawn],
                  series: [data.black.won+1,data.black.lost+1,data.black.drawn+1]
                }, donutOptions);
            }
            else
            {
                new Chartist.Pie('#right-chart.ct-chart', {
                  labels: ['' +data.black.won, '' +data.black.lost , '' + data.black.drawn],
                  series: [data.black.won,data.black.lost,data.black.drawn]
                }, donutOptions);
            }
        }
    });
});

var easeOutQuad = function (x, t, b, c, d) {
    return -c * (t /= d) * (t - 2) + b;
};

var $chart = $('#line-graph');

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
