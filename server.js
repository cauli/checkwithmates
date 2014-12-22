var express = require('express')
  , path    = require('path')
  , crypto  = require('crypto')
  , http    = require('http')
  , winston = require('winston')
  , fs      = require('fs');

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
var timer;

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


io.configure(function () { 
  io.set("transports", ["xhr-polling"]); 
  io.set("polling duration", 10); 
});

/*global.io.configure(function () {
  global.io.set("transports", ["xhr-polling"]);
  global.io.set("polling duration", 10);
});
*/
/*if (process.env.OPENSHIFT_NODEJS_IP) {
  io.configure(function(){
    io.set('transports', ['websocket']);
  });
}*/

io.sockets.on('connection', function (socket) {
  
  socket.on('start', function (data) {
    var token;
    var b = new Buffer(Math.random() + new Date().getTime() + socket.id);
    token = b.toString('base64').slice(12, 32);

    //token is valid for 5 minutes
    var timeout = setTimeout(function () {
      if (games[token].players.length === 0) {
        delete games[token];
        socket.emit('token-expired');
      }
    }, 5 * 60 * 1000);

    games[token] = {
      'creator': socket,
      'players': [],
      'interval': null,
      'timeout': timeout
    };

    games[token].moves = [];


    socket.emit('created', {
      'token': token
    });
  });

  socket.on('join', function (data) {
    var game, color, time = data.time;

    if (!(data.token in games)) {
      socket.emit('token-invalid');
      return;
    }

    clearTimeout(games[data.token].timeout);
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
      'time': data.time - data.increment + 1,
      'increment': data.increment
    });

    game.creator.emit('ready', {});

    socket.emit('joined', {
      'color': color,
      'moves': games[data.token].moves
    });
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

  socket.on('new-move', function (data) {
    var opponent;

    if (data.token in games) {
      games[data.token].moves.push(data.move)

      // TO-DO Create voting system here
      socket.broadcast.emit('move', {
          'move': data.move
      });
    }
  });

  socket.on('disconnect', function (data) {
    var player, opponent, game;
    for (var token in games) {
    game = games[token];

      for (var j in game.players) {
        player = game.players[j];

        if (player.socket === socket) {
          opponent = game.players[Math.abs(j - 1)];
          if (opponent) {
            opponent.socket.emit('opponent-disconnected');
          }
          clearInterval(games[token].interval);
        }
      }
    }
  });

  socket.on('send-message', function (data) {
    if (data.token in games) {
      var opponent = getOpponent(data.token, socket);
      if (opponent) {
        socket.broadcast.emit('receive-message', data);
      }
    }
  });
});

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