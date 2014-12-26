var express = require('express')
  , path    = require('path')
  , crypto  = require('crypto')
  , http    = require('http')
  , winston = require('winston')
  , fs      = require('fs')
  , _       = require('lodash')
  , ch      = require('./chess');

var app = express();

app.configure(function() {
//  app.set('ipaddress', process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1');
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser('45710b553b5b7293753d03bd3601f70a'));
  app.use(express.session());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function() {
  app.use(express.errorHandler());
});

app.get('/', function(req, res) {
  res.render('index');
});

app.get('/about', function(req, res) {
  res.render('about');
});

app.get('/play/:token/:time/:increment', function(req, res) {
  res.render('play', {
    'token': req.params.token,
    'time': req.params.time,
    'increment': req.params.increment
  });
});

app.get('/logs', function(req, res) {
  fs.readFile(__dirname + '/logs/games.log', function (err, data) {
    if (err) {
      res.redirect('/');
    }
    res.set('Content-Type', 'text/plain');
    res.send(data);
  });
});

var server = http.createServer(app).listen(app.get('port'), app.get('ipaddress'), function() {
  console.log("Express server listening on port " + app.get('port'));
});

var games = {};

/** 
 * Winston logger
 */
winston.add(winston.transports.File, {
  filename: __dirname + '/logs/games.log',
  handleExceptions: true,
  exitOnError: false,
  json: false
});
winston.remove(winston.transports.Console);
winston.handleExceptions(new winston.transports.Console());
winston.exitOnError = false;

/**
 * Sockets
 */
var io = require('socket.io').listen(server, {log: false});

// Only runs on production
if (process.env.PORT) {
  io.configure(function () { 
    io.set("transports", ["xhr-polling"]); 
    io.set("polling duration", 10); 
  });
}




io.sockets.on('connection', function (socket) {
  
  socket.on('start', function (data) {
    var token;
    var b = new Buffer(Math.random() + new Date().getTime() + socket.id);
    token = b.toString('base64').slice(12, 32);

    var creatorName = data.creatorName;

    //token is valid for 20 minutes
    var timeout = setTimeout(function () {
      if (games[token].players.length === 0) {
        delete games[token];
        socket.emit('token-expired');
      }
    }, 20 * 60 * 1000);

    games[token] = {
      'creator': socket,
      'creatorName': creatorName,
      'players': [],
      'time': 10,
      'interval': null,
      'timeout': timeout,
      'moveVotes': [],
      'currentColor' : "white",
      'timerStarted' : false,
      'name' : creatorName+"\'s room",
      'token' : token.toString()
    };

    games[token].moves = [];

    socket.emit('created', {
      'token': token,
      'creatorName': creatorName
    });
  });

  socket.on('ask-for-rooms', function(data) {
    var sendGames = [];

    for (var key in games) {
       var obj = games[key];
       var sendObj = {};

       sendObj['time'] = obj['time'];
       sendObj['currentColor'] = obj['currentColor'];
       sendObj['name'] = obj['name'];
       sendObj['time'] = obj['time'];
       sendObj['token'] = obj['token'];
       sendObj['players'] = obj['players'].length;

       sendGames.push(sendObj);

       /*for (var prop in obj) {
          if(obj.hasOwnProperty(prop)){

            console.log(prop + " = " + obj[prop]);
          }
       }*/
    }

    console.dir(sendGames);

    socket.emit('rooms', { 
      'rooms' : sendGames
    })
  });

  socket.on('join', function (data) {
    var game, color, time = data.time;

    if (!(data.token in games)) {
      socket.emit('token-invalid');
      return;
    }

    //clearTimeout(games[data.token].timeout);
    game = games[data.token];

    if (game.players.length >= 100) {
      socket.emit('full');
      return;
    } else if (game.players.length === 1) {
      if (game.players[0].color === 'black') {
        color = 'white';
      } else {
        color = 'black';
      }
      winston.log('info', 'Number of currently running games', { '#': Object.keys(games).length });
    } else {
      var colors = ['black', 'white'];

      color = colors[Math.floor(Math.random() * 2)];
    }

    //join room
    socket.join(data.token);

    games[data.token].players.push({
      'id': socket.id,
      'socket': socket,
      'color': color,
      'time': data.time,
      'increment': data.increment
    });

    game.creator.emit('ready', {});

    socket.emit('joined', {
      'color': color,
      'moves': games[data.token].moves
    });
  });
  
  socket.on('game-over', function (data) {
    if (data.token in games) {
        if(games[data.token].moves.length > 0)
        {
           games[data.token].moves = [];
           games[data.token].players = [];
           socket.broadcast.emit('restart-game');
        }
    }
  });

  socket.on('get-moves', function (data) {
    var player = getOpponent(data.token, socket);

    if (data.token in games) {
       if(player)
       {
          opponent.socket.emit('set-moves', {
            'moves': games[data.token].moves
          });
       }
    }
  });

  socket.on('new-vote', function (data) {
    if (data.token in games) {
      var fullColor = data.move.color === 'w' ? 'white' : 'black';

      if(fullColor != games[data.token].currentColor)
      {
        console.log("Wrong color tried to play off time");
      }
      else
      {
        console.log("Showing vote for the masses.");
        games[data.token].moveVotes.push(data.move);

        var sanMoveVotes = [];
        
        // Makes a "san" copy of the moves stored
        games[data.token].moveVotes.forEach(function(move) {
          sanMoveVotes.push(move.san)
        });

        console.log("SanMoveVotes = " + sanMoveVotes);

        console.log("CountOccurences = " + countOccurences(data.move.san));
        
        data.count = countOccurences(data.move.san);

        function countOccurences(arr) {
          var count = 0;

          for(var i = 0; i < sanMoveVotes.length; i ++)
          {

            if(sanMoveVotes[i] == data.move.san)
            {
              console.log(sanMoveVotes[i] + " is equal to " + data.move.san);
              count++;
            }
          }

          return count;
        }

        io.sockets.in(data.token).emit('show-vote', data);
      }
    }
  });

  socket.on('disconnect', function (data) {
    console.log('Player disconnected');

    var player, opponent, game;
    for (var token in games) {
    game = games[token];

      for (var j in game.players) {
        player = game.players[j];

        if (player.socket === socket) {

          // remove from the players array of the game
          games[token].players.splice(j, 1);

          opponent = game.players[Math.abs(j - 1)];
          if (opponent) {
            opponent.socket.emit('opponent-disconnected');
          }
          //clearInterval(games[token].interval);
        }
      }
    }
  });

  socket.on('send-message', function (data) {
    if (data.token in games) {
      socket.broadcast.emit('receive-message', data);
    }
  });

  socket.on('start-timer', function (data) {
    if (data.token in games)
    {
       if(games[data.token].timerStarted === false && games[data.token].players.length > 1)
       {
          games[data.token].timerStarted = true;
          startTimer('white', data.token, socket);
       }
    }
  });

  function startTimer(color, token, socket)
  {
    var game = games[token];
    var time_left;

    clearInterval(games[token].interval);

    if (token in games) {
      games[token].currentColor = color;
      game.timeWhite = game.timeBlack = games[token].time = 10;

      games[token].interval = setInterval(function() {
        
        if(color == 'white')
        {
          games[token].timeWhite -= 1;
          time_left = games[token].timeWhite;
        }
        else
        {
          games[token].timeBlack -= 1;
          time_left = games[token].timeBlack;
        }

        if (time_left >= 0) {
          // Just send the time
          io.sockets.in(token).emit('countdown', {
            'time': time_left,
            'color': color
          });
        } 
        else
        {
          console.log("Interval end for " + color);

          if(games[token].moveVotes.length > 0)
          {
            var mostCommonMove;

            if(games[token].moveVotes.length === 1)
            {
              mostCommonMove = games[token].moveVotes[0];
            }
            else
            {
              // TODO This actually returns the last voted in case of a vote draw, should return the first one
              var sanMoveVotes = [];
              
              // Makes a "san" copy of the moves stored
              games[token].moveVotes.forEach(function(move) {
                sanMoveVotes.push(move.san)
              });

              // Gets the most voted san move, in case of a draw it gets the first move
              var mostCommonSan = mostFrequent(sanMoveVotes);

              mostCommonMove =  _.find(games[token].moveVotes, { 'san': mostCommonSan });
            }

            var data = { 'token': token, 'move': mostCommonMove };
          
            // Make most voted move
            makeMove(data, token);
          }
          else
          {
            var chess = new ch.Chess();

            for(var i=0; i<games[token].moves.length; i++)
            {
              chess.move(games[token].moves[i].san);
            }

            var moves = chess.moves();

            var chosenMove = moves[Math.floor(Math.random() * moves.length)];

            var completeMove = chess.move(chosenMove);

            var data = { 'token': token, 'move': completeMove };

            // Make random move
            makeMove(data, token);
          }

          games[token].moveVotes = [];

          startTimer(inverseColor(color),token, socket);
        }
      }, 1000);
    }
  }

  function makeMove(data, token)
  {
    if (data.token in games) {
      if(typeof data.move !== undefined)
      {
        games[data.token].moves.push(data.move)

        // console.dir(games[data.token].moves);
        
        io.sockets.in(token).emit('new-moves', {
            'moves': games[data.token].moves
        });
      
      }
   
    }
  }



});


function mostFrequent(arr) {
    var uniqs = {};

    for(var i = 0; i < arr.length; i++) {
        uniqs[arr[i]] = (uniqs[arr[i]] || 0) + 1;
    }

    var max = { val: arr[0], count: 1 };
    for(var u in uniqs) {
        if(max.count < uniqs[u]) { max = { val: u, count: uniqs[u] }; }
    }

    return max.val;
}



function getOpponent(token, socket) {
  var player, game = games[token];

  for (var j in game.players) {
    player = game.players[j];

    if (player.socket === socket) {
      var opponent = game.players[Math.abs(j - 1)];

      return opponent;
    }
  }
}


function inverseColor(color)
{
  if(color == 'white')
  {
    return 'black';
  }
  else
  {
    return 'white';
  }
}



