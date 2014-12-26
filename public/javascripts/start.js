$(function () {
  var $token, $time, $increment, $nickname;

  $socket.emit('ask-for-rooms');

  setInterval(function() {
    $socket.emit('ask-for-rooms');
  }, 10000);
 
  $socket.on('rooms', function (data) {
    console.log("Got rooms!")
    console.dir(data.rooms);
    var rooms = data.rooms;

    $('#room-list').empty();

    for(var i=0; i<data.rooms.length; i++)
    {
      var link = $URL + '/play/' + data.rooms[i].token + '/' + data.rooms[i].time + '/0'; 
      $('#room-list').append("<a href='"+link+"'>"+ data.rooms[i].name + " - " + data.rooms[i].players + " playing</a>");
    }
  });

  $socket.on('created', function (data) {
    $token = data.token;

    /* $('#waiting').text('Wating for opponent to connect.');

    $('#game_link').html($URL + '/play/' + $token + '/' + $time + '/' + $increment); // create game link
    $('#game_link').click(function() {
      $(this).select(); // when clicked, link is automatically selected for convenience
    });*/

    document.location = $URL + '/play/' + $token + '/' + $time + '/' + $increment;
  });

  $socket.on('ready', function (data) {
    document.location = $URL + '/play/' + $token + '/' + $time + '/' + $increment;
  });

  $socket.on('token-expired', function (data) {
    $('#waiting').text('Game link has expired, generate a new one.');
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
