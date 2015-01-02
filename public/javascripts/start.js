(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','//www.google-analytics.com/analytics.js','ga');

ga('create', 'UA-58047511-1', 'auto');
ga('require', 'displayfeatures');
ga('send', 'pageview');


$(function () {

  var lastRoomClicked = "";

  function showNickname(payload, options) {
    $('#nickname-message').text(payload.msg);
    $('#nickname-ok').text('Enter');

    lastRoomClicked = payload.room;

    $('#nickname-mask').fadeIn(200);
    $(document).on('keydown', options, nicknameKeydownHandler);
  }

  function hideNickname(enter) {
    $('#nickname-mask').fadeOut(200);
    $(document).off('keydown', nicknameKeydownHandler);

    if(enter)
    {
      joinLastClickedRoom();
    }
  }

  $('#nickname-mask, #nickname-cancel').click(function (e) {
    e.preventDefault();
    hideNickname(false);
  });

  $('#nickname-ok').click(function(e) {
    var name = $('#nickname-inside').val();
    setName(name);
    hideNickname(true);
  });

  function nicknameKeydownHandler(e) {
    if (e.which === 13) {
      hideNickname(true);
    } else if (e.which === 27) {
      hideNickname(false);
    }
  }

  function setName(name)
  {
    $.cookie("name", name);
  }

  function getName()
  {
    return $.cookie("name");
  }

  $('#nickname-window').click(function (e) {
    e.stopPropagation();
  });

  function joinLastClickedRoom(){
    document.location = lastRoomClicked;
  }

  var $token, $time, $increment, $nickname;

  $socket.emit('ask-for-rooms');

  setInterval(function() {
    $socket.emit('ask-for-rooms');
  }, 4000);
 
  $socket.on('rooms', function (data) {
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

        $('#room-list').append("<a href='#' id='room"+i+"' room='"+link+"'>"+ data.rooms[i].name + " - " + data.rooms[i].whitePlayers + "vs"+ data.rooms[i].blackPlayers+"</a>");
        
        $('#room'+i).click(function() {
          showNickname({'msg':'Choose your nickname:','room':link}, {
            accept: joinLastClickedRoom
          });
        });
      }
    }
  });

  $socket.on('created', function (data) {
    $token = data.token;

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

  if(getName() !== null)
  {
    $('#nickname').val(getName());
  }

  $('#play').click(function (ev) {
    var nickname = $('#nickname');
    $nickname = $('#nickname').val();


    if($nickname.length <= 1)
    {
      nickname.addClass('invalid');
      setTimeout(function() { nickname.removeClass('invalid'); }, 1000)
      return false;
    }

    // Set a cookie for the name
    setName($nickname);

    $time = 10;
    $increment = 0;

    $socket.emit('start', {
      'creatorName':$nickname,
      'time':12
    });

    $('#waiting').text('Generating game link').slideDown(400);
    ev.preventDefault();
  });
});
