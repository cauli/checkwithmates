var express     = require('express')
  , path        = require('path')
  , crypto      = require('crypto')
  , http        = require('http')
  , winston     = require('winston')
  , fs          = require('fs')
  , _           = require('lodash')
  , ch          = require('./chess')
  , passport    = require('passport')
  , forgot    = require('./config/forgot')
  , dbconfig    = require('./config/database')
  , ConnectionManager  = require('./config/ConnectionManager')
  , flash       = require('connect-flash')
  , bodyParser  = require('body-parser')
  , mysql = require('mysql')
  , User = require('./config/User');


var app = express();

app.configure(function() {
//  app.set('ipaddress', process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1');
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  //app.use(express.json());
  app.use(express.cookieParser('checkwithsecrets'));
  app.use(express.bodyParser());
  //app.use(express.multipart());
  app.use(express.methodOverride());
  app.use(express.cookieParser('45710b553b5b7293753d03bd3601f70a'));
  app.use(express.session());
  
  app.use(flash());
  
  app.use(express.static(path.join(__dirname, 'public')));

  // required for passport

  app.use(express.session({ secret: '99audjemncpslas]feoj392kjmdw' } )); // session secret
  
  app.use(passport.initialize());
  app.use(passport.session()); // persistent login sessions
  app.use(app.router);

});

require('./config/passport')(passport); // pass passport for configuration

app.configure('development', function() {
  app.use(express.errorHandler());
});

app.get('/', isLoggedIn, function(req, res) {
  User.getRatingByUser(req.user.username, function (rating){
    var info =  req.flash('loginMessage');
    console.log(info);
    res.render('index', { message: "" +info + "", 'rating':rating, username: req.user.username });
  });
});

app.get('/lobby', isLoggedIn, function(req, res) {
  var info =  req.flash('loginMessage');
  console.log(info);
  res.render('index', { message: "" +info + "", username: req.user.username });
});

app.get('/profile', isLoggedIn, function(req, res) {
  var info =  req.flash('loginMessage');
  console.log(info);
  res.render('index', { message: "" +info + "", username: req.user.username });
});


// =====================================
// FORGOT===============================
// =====================================

app.get('/forgot', function(req, res) {
  var info =  req.flash('forgotMessage');
  res.render('forgot', { message: "" +info + "" });
});

app.post('/forgot', function(req, res){    
  var email = req.body.email;

  forgot.forgot(email, req, res, 'forgot');
});


// =====================================
// LOGIN ===============================
// =====================================

app.get('/login', function(req, res) {
  var info = req.flash('loginMessage');
  console.log(info)
  res.render('login', { message: "" +info + "" });
});

app.post('/login', passport.authenticate('local-login', {
  successRedirect : '/', // redirect to the secure profile section
  failureRedirect : '/login', // redirect back to the login page if there is an error
  failureFlash : true // allow flash messages
}));

// =====================================
// LOGOUT ==============================
// =====================================

app.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/login');
});

app.get('/about', function(req, res) {
  res.render('about');
});

app.get('/signup', function(req, res) {
  res.render('signup', { message: req.flash('signupMessage') });
});


// =====================================
// SIGNUP ==============================
// =====================================

app.post('/signup', passport.authenticate('local-signup', {
  successRedirect : '/', // redirect to the secure lobby section
  failureRedirect : '/signup', // redirect back to the signup page if there is an error
  failureFlash : true // allow flash messages
}));


// =====================================
// PROFILE =============================
// =====================================

app.get('/profile/:name', isLoggedIn, function(req, res) {
  User.getRatingByUser(req.user.username, function (rating){
    res.render('profile', {
      'name': cleanInput(req.params.name),
      'rating': rating,
      username: req.user.username });
  });
});

function cleanInput(input)
{
  return input.replace(/(<([^>]+)>)/ig,"");
}

app.get('/play/:token/:time/:increment/:session', isLoggedIn, function(req, res) {
  User.getRatingByUser(req.user.username, function (rating){
    res.render('play', {
      'token': req.params.token,
      'time': req.params.time,
      'increment': req.params.increment,
      'session': req.params.session,
      'username': req.user.username,
      'rating': rating
    });
  });
});

function isLoggedIn(req, res, next) {

  // if user is authenticated in the session, carry on
  if (req.isAuthenticated())
    return next();

  // if they aren't redirect them to the home page
  res.redirect('/login');
}

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
    io.set("polling duration", 15); 
  });
}

// User.setNewRating('cauli',2600,true);

io.sockets.on('connection', function (socket) {
  
  socket.on('start', function (data) {
    var token;
    var b = new Buffer(Math.random() + new Date().getTime() + socket.id);
    token = b.toString('base64').slice(12, 32);

    console.log('Starting');
    console.dir(data);
    var creatorName = cleanInput(data.creatorName);
    var roomName = cleanInput(data.roomName);

    if(roomName.length === 0)
    {
      roomName = creatorName+'\'s table'; 
    }
    //token is valid for 20 minutes
    var timeout = setTimeout(function () {
      if (!(token in games)) 
      {
        socket.emit('token-invalid');
        return;
      }
      else
      {
        if (games[token].players.length === 0) {
          delete games[token];
          socket.emit('token-invalid');
        }
      }
    }, 20 * 60 * 1000);

    games[token] = {
      'creator': socket,
      'creatorName': creatorName,
      'players': [],
      'time': data.time,
      'interval': null,
      'timeout': timeout,
      'moveVotes': [],
      'whitelistedMoveVotes': [],
      'currentColor' : "white",
      'timerStarted' : false,
      'name' : roomName,
      'token' : token.toString(),
      'hasAdmin' : false,
      'whitePlayers' : 0,
      'blackPlayers' : 0
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
       sendObj['blackPlayers'] = obj['blackPlayers'];
       sendObj['whitePlayers'] = obj['whitePlayers'];
       sendObj['players'] = obj['players'].length;

       sendGames.push(sendObj);
    }

    //console.dir(sendGames);

    socket.emit('rooms', { 
      'rooms' : sendGames
    })
  });

  /* DEPRECATED WITH LOGIN SYSTEM */
  /*
  socket.on('name-change', function (data) {
    if (!(data.token in games)) 
    {
      socket.emit('token-invalid');
      return;
    }

    for (var j in games[data.token].players) 
    {
      player = games[data.token].players[j];

      if (player.socket === socket) {
        games[data.token].players[j].name = cleanInput(data.name);
      }
    }

    // Send new player to all people.
    io.sockets.in(data.token).emit('receive-players', { 
      'players' : getCleanPlayers(data.token)
    });
  });
  */


  socket.on('join', function (data) {
    var game, color, time = data.time;

    if (!(data.token in games)) {
      socket.emit('token-invalid');
      return;
    }

    console.dir(data);

    //clearTimeout(games[data.token].timeout);
    game = games[data.token];

    var admin = false;

    var name = '';

    if(typeof data.username === undefined)
    {
      name = 'Guest'+Math.ceil(Math.random()*1000);
    }
    else
    {
      name = data.name;
    }

    // Checka se é o criador da sala e
    // TODO Dá autoridade de admin para ele
    if(data.session == game.creator.id && game.hasAdmin === false)
    {
      games[data.token].hasAdmin = true;
      admin = true;
      name = game.creatorName;
    }

    if (game.players.length >= 100) {
      socket.emit('full');
      return;
    } else if (game.players.length === 1) {
      io.sockets.in(data.token).emit('ready', {});

      if (game.players[0].color === 'black') {
        color = 'white';
      } else {
        color = 'black';
      }
      winston.log('info', 'Number of currently running games', { '#': Object.keys(games).length });
    } else {
      var blackPlayers = _.where(games[data.token].players, { 'color': 'black' } );
      var whitePlayers = _.where(games[data.token].players, { 'color': 'white' } );

      if(blackPlayers.length <= whitePlayers.length)
      {
        color = 'black';
      }
      else
      {
        color = 'white';
      }
    }

    //join room
    socket.join(data.token);

    games[data.token].players.push({
      'id': socket.id,
      'socket': socket,
      'color': color,
      'time': data.time,
      'increment': data.increment,
      'name': name,
      'admin': admin,
      'lastMove': '',
      'won': 0
    });

    games[data.token].blackPlayers = _.where(games[data.token].players, { 'color': 'black' } ).length;
    games[data.token].whitePlayers = _.where(games[data.token].players, { 'color': 'white' } ).length;

    // Send new player to all people.
    io.sockets.in(data.token).emit('receive-players', { 
      'players' : getCleanPlayers(data.token)
    });

    socket.emit('joined', {
      'playerCount' : games[data.token].players.length,
      'color': color,
      'moves': games[data.token].moves
    });

    // Send current move votes to the new player
    games[data.token].moveVotes.forEach(function(move) {
      var count = countOccurences(move.san, data.token)
      socket.emit('show-vote', {'count': count, 'move':move, 'by':move.by});
    });
  });
  
  function getCleanPlayers(token)
  {
    var cleanedPlayers = [];

    games[token].players.forEach(function(player) {
      cleanedPlayers.push({'id':player.socket.id, 'color':player.color, 'name':player.name, 'admin':player.admin, 'lastMove': player.lastMove, 'won': player.won });
    });

    return cleanedPlayers;  
  }

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

  function checkMoveValid(token, san)
  {
    // Avoid slow calculations
    if(_.contains(games[token].whitelistedMoveVotes, san))
    {
      return true;
    }

    var chess = new ch.Chess();

    for(var i=0; i<games[token].moves.length; i++)
    {
      chess.move(games[token].moves[i].san);
    }

    if(chess.move(san) === null)
    {
      console.log("Invalid san move tried, not voted.");
      return false;
    }

    var validation = chess.validate_fen(chess.fen());

    if(validation.valid === false)
    {
      console.log("Validation error: " + validation.error);
      return false;
    }

    games[token].whitelistedMoveVotes.push(san);

    return true;
  }

  socket.on('new-vote', function (data) {
    if (data.token in games) {
      if(data.move === null)
      {
        socket.emit('invalid-move');
      }

      var fullColor = data.move.color === 'w' ? 'white' : 'black';

      if(fullColor != games[data.token].currentColor)
      {
        console.log("Wrong color tried to play off time");
      }
      else
      {
        // Check in chess if this move can actually be made on the current game or else it can be faked via client-side   
        if(!checkMoveValid(data.token, data.move.san))
        {
          socket.emit('invalid-move');
        }
        else
        {

          // TODO Cache this count on the game object. 
          var playerCount;

          if(fullColor == 'white')
          {
            playerCount = games[data.token].whitePlayers;
          }
          else
          {
            playerCount = games[data.token].blackPlayers;
          }

          for (var j in games[data.token].players) {
            player = games[data.token].players[j];

            if (player.socket === socket) {
              games[data.token].players[j].lastMove = data.move.san;
              data.by = games[data.token].players[j].name;
              data.move.by = games[data.token].players[j].name;
            }
          }


          games[data.token].moveVotes.push(data.move);
        
          data.count = countOccurences(data.move.san, data.token);

          // Showing votes for everyone
          io.sockets.in(data.token).emit('show-vote', data);

          if(data.count > playerCount/2)
          {
            calculateVotesAndMakeMove(data.token, fullColor, socket );
          }
        }      
      }
    }
  });

  function countOccurences(san, token) {
    var sanMoveVotes = [];
  
    // Makes a "san" copy of the moves stored
    games[token].moveVotes.forEach(function(move) {
      sanMoveVotes.push(move.san)
    });

    var count = 0;

    for(var i = 0; i < sanMoveVotes.length; i ++)
    {
      if(sanMoveVotes[i] == san)
      {
        // sanMoveVotes[i] + " is equal to " + san
        count++;
      }
    }

    return count;
  }

  socket.on('disconnect', function (data) {
    console.log('Player disconnected');

    var player, opponent, game;
    for (var token in games) {
    game = games[token];

      var count = 0;

      for (var j in game.players) {
        count++;
        player = game.players[j];

        if (player.socket === socket) {

          console.log(games[token].players[j].name + ' disconnected from ' + token);

          // remove from the players array of the game
          games[token].players.splice(j, 1);

          games[token].blackPlayers = _.where(games[token].players, { 'color': 'black' } ).length;
          games[token].whitePlayers = _.where(games[token].players, { 'color': 'white' } ).length;

          opponent = game.players[Math.abs(j - 1)];
          if (opponent) {
            opponent.socket.emit('receive-players', { 
              'players' : getCleanPlayers(token)
            });

            opponent.socket.emit('opponent-disconnected');
          }
          //clearInterval(games[token].interval);
        }
      }


      
      // If 0 players, close room
      /*if(count === 0)
      {
        delete games[token];
      }*/
    }
  });

  function cleanInput(input)
  {
    if(typeof input === undefined || !input)
    {
      return "";
    }
    else
    {
      return input.replace(/(<([^>]+)>)/ig,"");
    }
  }

  socket.on('send-message', function (data) {
    if (data.token in games) {

      var received = data;

      received.username = "Unknown";

      received.color = (data.color);
      received.message = (data.message);

      for (var j in games[data.token].players) {
        if(socket.id == games[data.token].players[j].socket.id)
        {
          received.username = games[data.token].players[j].name;
        }
      }

      socket.broadcast.emit('receive-message', received);
    }
  });

  socket.on('start-timer', function (data) {
    if (data.token in games)
    {
       // If the game has not yet started and the player entering is not the room's creator
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

    if (!(token in games)) {
      socket.emit('token-invalid');
      return;
    }
  
    var time_left;

    clearInterval(games[token].interval);

    if (token in games) {
      games[token].currentColor = color;
      game.timeWhite = game.timeBlack = games[token].time;

      // Clean up last moves
      for(var i =0; i < games[token].players.length; i++)
      {
        if( games[token].players[i].color == color )
        {
          games[token].players[i].lastMove = '';
        }
      }

      io.sockets.in(token).emit('receive-players', { 
        'players' : getCleanPlayers(token)
      });

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
          calculateVotesAndMakeMove(token, color, socket);
        }
      }, 1000);
    }
  }

  function checkForFinishedGame(token)
  {
    var chess = new ch.Chess();

    for(var i=0; i<games[token].moves.length; i++)
    {
      chess.move(games[token].moves[i].san);
    }

    var validation = chess.validate_fen(chess.fen());

    // The game has an invalid position, we should warn the users and invalidate this token
    if(validation.valid === false)
    {
      console.log("Validation error: " + validation.error);
      io.sockets.in(token).emit('invalid-game');
      clearInterval(games[token].interval);
      delete games[token];
      return false;
    }

    if (chess.game_over()) {
      var result = "";
      var resultBoolean = 0; // 1 = white won, 0 = draw, -1 = black won
      var victoryColor = 'none';

      if (chess.in_checkmate())
      {
        result = chess.turn() === 'b' ? 'Checkmate. White wins!' : 'Checkmate. Black wins!'
        resultBoolean = chess.turn() === 'b' ? 1 : -1;
        victoryColor = chess.turn() === 'b' ? 'white' : 'black';
      }
      else if (chess.in_draw()) {
        result = "Draw.";
      }
      else if (chess.in_stalemate()) {
        result = "Stalemate.";
      }
      else if (chess.in_threefold_repetition()) {
        result = "Draw. (Threefold Repetition)";
      }
      else if (chess.insufficient_material()) {
        result = "Draw. (Insufficient Material)";
      }

      io.sockets.in(token).emit('receive-players', {
        'players' : getCleanPlayers(token)
      });

      io.sockets.in(token).emit('finished-game', {
        'result': result
      });

      clearInterval(games[token].interval);

      calculateNewRatings(token, victoryColor);

      //delete games[token];
    }
  }

  function calculateVotesAndMakeMove(token, color, socket)
  {
    // Nesse caso existe pelo menos um voto de movimento
    if(games[token].moveVotes.length > 0)
    {
      var mostCommonMove;

      if(games[token].moveVotes.length === 1)
      {
        mostCommonMove = games[token].moveVotes[0];
      }
      else
      {
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
      
      games[token].moveVotes = [];
      games[token].whitelistedMoveVotes = [];

      checkForFinishedGame(token, color);

      startTimer(inverseColor(color),token, socket);
    }
    // Não existe voto, o computador vai fazer uma jogada aleatória
    else
    {
      /*
       Depreacted: Use finished-game instead
       */
     /* io.sockets.in(token).emit('lost-game', {
        'color': color
      });*/

      calculateNewRatings(token, color);

      // Put WINNER or LOSER on "won" attribute
      for (var j in games[token].players) {
        if(color == games[token].players[j].color)
        {
          games[token].players[j].won = -1;
        }
        else
        {
          games[token].players[j].won = 1;
        }
      }

      var result = "White didn't play and lost the game";

      if(color == 'black')
      {
        result = "Black didn't play and lost the game";
      }

      // Send new player to all people.
      io.sockets.in(token).emit('receive-players', { 
        'players' : getCleanPlayers(token)
      });

      io.sockets.in(token).emit('finished-game', {
        'result': result
      });

      clearInterval(games[token].interval);

      //delete games[token];

      /* This makes a random move. Really random move.

      /*var chess = new ch.Chess();

      for(var i=0; i<games[token].moves.length; i++)
      {
        chess.move(games[token].moves[i].san);
      }

      var moves = chess.moves();

      var chosenMove = moves[Math.floor(Math.random() * moves.length)];

      var completeMove = chess.move(chosenMove);

      var data = { 'token': token, 'move': completeMove };

      // Make random move
      makeMove(data, token);*/
    }

   
  }

  function makeMove(data, token)
  {
    if (data.token in games) {
      if(typeof data.move !== undefined)
      {
        games[data.token].moves.push(data.move);

        io.sockets.in(token).emit('move', {
            'move': data.move
        });
      }
   
    }
  }

  function mostFrequent(arr) 
  {
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

  function getTeamAverageRating(color, token, callback)
  {
    var game = games[token];
    var teamRatingArray = [];

    game.blackPlayers = _.where(games[token].players, { 'color': 'black' } ).length;
    game.whitePlayers = _.where(games[token].players, { 'color': 'white' } ).length;


    var countPlayers = 0;

    for (var j in game.players) {
      var player = game.players[j];

      if(player.color == color)
      {
        User.getRatingByUser(player.name, addToTeamRating);
      }
     }

    function addToTeamRating(rating)
    {
      countPlayers++;

      teamRatingArray.push(rating);

      console.log("Pushing " + rating + " to teamRatingArray");

      if(color == 'white')
      {
        if(countPlayers == game.blackPlayers) {
          console.log("Average is " + average(teamRatingArray));
          return callback(average(teamRatingArray), token);
        }
      }
      else if(color == 'black')
      {
        if(countPlayers == game.whitePlayers) {
          console.log("Average is " + average(teamRatingArray));
          return callback(average(teamRatingArray), token);
        }
      }
      else
      {
        console.error('Invalid color to average!')
      }
    }
  }

  function average(arr)
  {
    var sum = 0;

    for( var i = 0; i < arr.length; i++ ){
      sum += parseInt( arr[i], 10 ); //don't forget to add the base
    }

    if(arr.length > 0)
    {
      return sum/arr.length;
    }
    else
    {
      console.error("Cannot average empty array");
      return 0;
    }
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

  function calculateNewRatings(token, victoryColor)
  {
    getTeamAverageRating('white', token, finishedAverageWhite);
    getTeamAverageRating('black', token, finishedAverageBlack);

    var finished = 0;
    var aW;
    var aB;

    // TODO Solve this elegantly with promises
    function finishedAverageWhite(averageWhite, token) {
      finished++;
      aW = averageWhite;

      if(finished == 2)
      {
        gotAverages(aW,aB, token);
      }
    }

    function finishedAverageBlack(averageBlack, token) {
      finished++;
      aB = averageBlack;

      if(finished == 2)
      {
        gotAverages(aW,aB, token);
      }
    }

    function gotAverages(averageWhite, averageBlack, token)
    {
      console.log("Average team rating for white is " + averageWhite);
      console.log("Average team rating for black is " + averageBlack);

      // Put WINNER or LOSER on "won" attribute
      for (var j in games[token].players) {
        var playerColor = games[token].players[j].color;

        if(victoryColor == 'none')
        {
          User.setNewRating(games[token].players[j].name, playerColor == 'white' ? averageBlack : averageWhite, 0.5);
        }
        else if(playerColor == victoryColor)
        {
          games[token].players[j].won = 1;
          User.setNewRating(games[token].players[j].name, playerColor == 'white' ? averageBlack : averageWhite, 1);
        }
        else
        {
          games[token].players[j].won = -1;
          User.setNewRating(games[token].players[j].name, playerColor == 'white' ? averageBlack : averageWhite, 0);
        }
      }
    }
  }
});





