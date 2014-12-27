(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','//www.google-analytics.com/analytics.js','ga');

ga('create', 'UA-58047511-1', 'auto');
ga('send', 'pageview');


$(function () {
  var $token, $time, $increment, $nickname;

  $socket.emit('ask-for-rooms');

  setInterval(function() {
    $socket.emit('ask-for-rooms');
  }, 6000);
 
  $socket.on('rooms', function (data) {
    console.log("Got rooms!")
    console.dir(data.rooms);
    var rooms = data.rooms;

    $('#room-list').empty();

    if(data.rooms.length === 0)
    {
      $('#room-list').append("<span id='no_rooms'>no rooms found, try creating one!</span>");
    }
    else
    {
      for(var i=0; i<data.rooms.length; i++)
      {
        var link = $URL + '/play/' + data.rooms[i].token + '/' + data.rooms[i].time + '/0/0'; 

        if(i > 0)
        {
          $('#room-list').append("<span class='separator'></span>");
        }

        $('#room-list').append("<a href='"+link+"'>"+ data.rooms[i].name + " - " + data.rooms[i].players + " playing</a>");
      }
    }
  });

  $socket.on('created', function (data) {
    $token = data.token;

    /* $('#waiting').text('Wating for opponent to connect.');

    $('#game_link').html($URL + '/play/' + $token + '/' + $time + '/' + $increment); // create game link
    $('#game_link').click(function() {
      $(this).select(); // when clicked, link is automatically selected for convenience
    });*/
    
    document.location = $URL + '/play/' + $token + '/' + $time + '/' + $increment + '/' + $socket.socket.sessionid;
  });

  $socket.on('ready', function (data) {
    document.location = $URL + '/play/' + $token + '/' + $time + '/' + $increment + '/' + $socket.socket.sessionid;
  });

  $socket.on('token-expired', function (data) {
    $('#waiting').text('Game link has expired, generate a new one.');
  });


  $('#play, #create_form').submit(function (e) {
    e.preventDefault();

    $('#play').click();
  });

  $('#play').click(function (ev) {
    var nickname = $('#nickname');
    $nickname = $('#nickname').val();

    if($nickname.length <= 1)
    {
      nickname.addClass('invalid');
      setTimeout(function() { nickname.removeClass('invalid'); }, 1000)
      return false;
    }

    $time = 10;
    $increment = 0;

    $socket.emit('start', {
      'creatorName':$nickname
    });

    $('#waiting').text('Generating game link').slideDown(400);
    ev.preventDefault();
  });
});
