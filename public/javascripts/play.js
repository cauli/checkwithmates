$(function() {

  var from, to, promotion, rcvd;
  var countHiddenMoves = 0;
  var $side  = 'w';
  var $piece = null;
  var $chess = new Chess();
  var $gameOver = false;
  var $chessboardWhite = $('.chess_board.white').clone();
  var $chessboardBlack = $('.chess_board.black').clone();

  function modalKeydownHandler(e) {
    e.preventDefault();
    if (e.which === 13 || e.which === 27) {
      hideModal();
    }
  }

  function offerKeydownHandler(e) {
    e.preventDefault();
    if (e.which === 13) {
      hideOffer();
      e.data.accept();
    } else if (e.which === 27) {
      hideOffer();
      e.data.decline(); 
    }
  }

  function showModal(message) {
    $('#modal-message').text(message);
    $('#modal-mask').fadeIn(200);
    $(document).on('keydown', modalKeydownHandler);
  }

  function hideModal() {
    $('#modal-mask').fadeOut(200);
    $(document).off('keydown', modalKeydownHandler);
  }

  function showOffer(offer, options) {
    $('#offer-message').text(offer);
    $('#offer-mask').fadeIn(200);
    $(document).on('keydown', options, offerKeydownHandler);
  }

  function hideOffer() {
    $('#offer-mask').fadeOut(200);
    $(document).off('keydown', offerKeydownHandler);
  }

  function selectPiece(el) {
    el.addClass('selected');
  }

  function unselectPiece(el) {
    el.removeClass('selected');
  }

  function isSelected(el) {
    return el ? el.hasClass('selected') : false;
  }

  function movePiece(from, to, promotion, rcvd) {

    var move = $chess.move({
      'from': from,
      'to': to,
      promotion: promotion
    });

    if (move && !$gameOver) {
      var tdFrom = $('td.' + from.toUpperCase());
      var tdTo = $('td.' + to.toUpperCase());

      //highlight moves
      if ($('td').hasClass('last-target')){
        $('td').removeClass('last-target last-origin');
      }
      tdFrom.addClass('last-origin');
      tdTo.addClass('last-target');
      
      var piece = tdFrom.find('a'); // piece being moved

      if(!rcvd)
      {
        piece.css('opacity', 0.5);
      }

      var moveSnd = $("#moveSnd")[0];
      unselectPiece(piece.parent());
      
      /*
      if (tdTo.html() !== '') { //place captured piece next to the chessboard
        $('#captured-pieces')
          .find($chess.turn() === 'b' ? '.b' : '.w')
          .append('<li>' + tdTo.find('a').html() + '</li>');
      }
      */
      
      tdTo.html(piece);

      $piece = null;

      // en passant move
      if (move.flags === 'e'){
        var enpassant = move.to.charAt(0) + move.from.charAt(1);
        $('td.' + enpassant.toUpperCase()).html('');
      }
      
      //kingside castling
      var rook;
      if (move.flags === 'k'){
        if (move.to === 'g1'){
          rook = $('td.H1').find('a');
          $('td.F1').html(rook);
        }
        else if (move.to === 'g8'){
          rook = $('td.H8').find('a');
          $('td.F8').html(rook);
        }
      }

      //queenside castling
      if (move.flags === 'q'){
        if (move.to === 'c1'){
          rook = $('td.A1').find('a');
          $('td.D1').html(rook);
        }
        else if (move.to === 'c8'){
          rook = $('td.A8').find('a');
          $('td.D8').html(rook);
        }
      }

      //promotion
      if (move.flags === 'np' || move.flags === 'cp'){
        var square = $('td.' + move.to.toUpperCase()).find('a');
        var option = move.promotion;
        var promotion_w = {
          'q': '&#9813;',
          'r': '&#9814;',
          'n': '&#9816;',
          'b': '&#9815;'
        };
        var promotion_b = {
          'q': '&#9819;',
          'r': '&#9820;',
          'n': '&#9822;',
          'b': '&#9821;'
        };
        if (square.hasClass('white')){
          square.html(promotion_w[option]);
        } else {
          square.html(promotion_b[option]);
        }
      }
      
      if ($('#sounds').is(':checked')) {
        moveSnd.play();
      }
      
      //feedback
      var fm = $('.feedback-move');
      var fs = $('.feedback-status');

      $chess.turn() === 'b' ? fm.text('Black to move.') : fm.text('White to move.');
      fm.parent().toggleClass('blackfeedback whitefeedback');

      $chess.in_check() ? fs.text(' Check.') : fs.text('');

      //game over
      if ($chess.game_over()) {
        fm.text('');
        var result = "";

        if ($chess.in_checkmate())
          result = $chess.turn() === 'b' ? 'Checkmate. White wins!' : 'Checkmate. Black wins!'
        else if ($chess.in_draw())
          result = "Draw.";
        else if ($chess.in_stalemate())
          result = "Stalemate.";
        else if ($chess.in_threefold_repetition())
          result = "Draw. (Threefold Repetition)";
        else if ($chess.insufficient_material())
          result = "Draw. (Insufficient Material)";
        fs.text(result);
      }

      /* Add all moves to the table */
      var pgn = $chess.pgn({ max_width: 5, newline_char: ',' });
      var moves = pgn.split(',');
      var last_move = moves.pop().split('.');
      var move_number = last_move[0];
      var move_pgn = $.trim(last_move[1]);

      if (move_pgn.indexOf(' ') !== -1) {
        var moves = move_pgn.split(' ');
        move_pgn = moves[1];
      }

      $('#moves tbody tr').append('<td><strong>' + move_number + '</strong>. ' + move_pgn + '</td>');

      if (rcvd === undefined) {

        $socket.emit('new-vote', {
          'token': $token,
          'move': move
        });

       /* $socket.emit('new-move', {
          'token': $token,
          'move': move
        });*/
      }

      if ($chess.game_over()) {
        $gameOver = true;

        $socket.emit('game-over', {
          'token': $token
        });
        // $socket.emit('timer-clear-interval', {
        //   'token': $token
        // });

        $('.resign').hide();
        $('.rematch').show();
        showModal(result);
      } else {
        if ($chess.turn() === 'b') {
          // $socket.emit('timer-black', {
          //   'token': $token
          // });
        } else {
          // $socket.emit('timer-white', {
          //   'token': $token
          // });
        }
        $('.clock li').each(function() {
          $(this).toggleClass('ticking');
        });
      }
    }
  }

  function unbindMoveHandlers() {
    var moveFrom = $('.chess_board a');
    var moveTo = $('.chess_board td');

    moveFrom.off('click', movePieceFromHandler);
    moveTo.off('click', movePieceToHandler);

    moveFrom.attr('draggable', false).off('dragstart', dragstartHandler);
    moveFrom.off('dragend');
    moveTo.attr('draggable', false).off('drop', dropHandler);
    moveTo.off('dragover');
  }

  function bindMoveHandlers() {
    var moveFrom = $('.chess_board a');
    var moveTo = $('.chess_board td');

    moveFrom.on('click', movePieceFromHandler);
    moveTo.on('click', movePieceToHandler);

    if (dndSupported()) {
      moveFrom.attr('draggable', true).on('dragstart', dragstartHandler);
      moveTo.on('draggable', true).on('drop', dropHandler);
      moveTo.on('dragover', function (e) {
        e.preventDefault();
        e.originalEvent.dataTransfer.dropEffect = 'move';
      });
      moveFrom.on('dragend', function (e) {
        moveTo.removeClass('moving');
      });
    }
  }

  function escapeHTML(html) {
    return $('<div/>').text(html).html();
  }

  /* socket.io */

  function rematchAccepted() {
    $socket.emit('rematch-confirm', {
      'token': $token,
      'time': $time,
      'increment': $increment
    });
  }

  function rematchDeclined() {
    $socket.emit('rematch-decline', {
      'token': $token
    });
  }

  $socket.emit('join', {
    'token': $token,
    'time': $time,
    'increment': $increment,
    'session': $session
  });

  $socket.on('reset-board', function (data) {
    $chess.reset();
  });

  $socket.on('token-invalid', function (data) {
    showModal('Game link is invalid or has expired.');
  });

  $socket.on('restart-game', function(data) {
    location.reload();
  });

  $socket.on('show-vote', function(data) {
    var pieces = {}
    
    console.log("Showing vote " + data.move.color + " " + data.move);
    console.dir(data.move);
    
    var color = data.move.color;

    var colorClass;

    if (color === 'b') {
      // this is a vote for a white move
      pieces = {  
        'p': '&#9823',
        'q': '&#9819;',
        'r': '&#9820;',
        'n': '&#9822;',
        'b': '&#9821;'
      };

      colorClass = 'blackCount';
    } else {
      // this is a vote for a black move
      pieces = {
        'p': '&#9817',
        'q': '&#9813;',
        'r': '&#9814;',
        'n': '&#9816;',
        'b': '&#9815;'
      };

      colorClass = 'whiteCount';
    }

    var slot = $('td.' + data.move.to.toUpperCase());
    var square = slot.find('a');
    var piece = data.move.piece;

    if(square.length === 0)
    {
      console.log("Sq len 0");


      slot.append('<span class="count '+colorClass+'">'+data.count +" <span class='san'>" + data.move.san + '</span></span><a draggable="false">'+pieces[piece]+'</a>');
      square = slot.find('a');
    }
    else
    {
      console.log("Sq len > 0");
      if(slot.find('.count').length === 0)
      {
        console.log("Sq count === 0");
        slot.prepend('<span class="count '+colorClass+'">'+data.count +" <span class='san'>" + data.move.san + '</span></span>')
      }
      else
      {
        slot.find('.count').text(data.count);
        slot.find('.san').text(data.move.san);
      }

  
    }

    square.css('opacity', 0.25);
      
    // var promotion = data.move.promotion;
  });

  $socket.on('joined', function (data) {
    if (data.color === 'white') {
      $side = 'w';
      $('.chess_board.black').remove();
    } else {
      $side = 'b';
      $('.chess_board.white').remove();
      $('.chess_board.black').show();
    }

    $socket.emit('start-timer', {
      'token': $token
    });

    if(data.moves.length != 0)
    {
      console.dir(data.moves);

      // Recreate all the game.
      for(var i=0; i<data.moves.length; i++)
      {
        if(data.moves[i] !== null)
        {
          // Just to send it not empty
          if(typeof data.moves[i].promotion === undefined)
          {
            data.moves[i].promotion = "q";
          }

          movePiece(data.moves[i].from,data.moves[i].to, data.moves[i].promotion, true);
        }

      }
    }

    $('.clock li.white').addClass('ticking');

    if($side === 'b')
    {
      // Remover o sender do lado esquerdo
      $('.white.sendMessage').remove();
      $('.white#chat').css('max-height','237px');
    }
    else
    {
      // Remover o sender do lado direito
      $('.black.sendMessage').remove();
      $('.black#chat').css('max-height','237px');
    }

    var randomPhrases = [ "state your claim",
                          "we will never resign",
                          "Karpov would be proud",
                          "how to en passant?",
                          "genius!",
                          data.moves.length + " moves already?" 
                        ]


    $('.sendMessage').find('input').addClass($side === 'b' ? 'black' : 'white');
    $('.sendMessage').find('input').attr('placeholder', randomPhrases[Math.floor(Math.random() * randomPhrases.length)])
  });

  $socket.on('new-moves', function(data) {
    $piece = null;
    $gameOver = false;
    $chess.reset();

    $('#moves tbody tr').empty();
    $('#captured-pieces ul').each(function () {
      $(this).empty();
    })

    // Restart the boards to the starting position!
    if ($side === 'w') {
      $('.chess_board.white').remove();
      $('#board_wrapper').append($chessboardWhite.clone());
    } else {
      $('.chess_board.black').remove();
      $('#board_wrapper').append($chessboardBlack.clone());
      $('.chess_board.black').show();
    }
    
    bindMoveHandlers();

    if(data.moves.length != 0)
    {
      //console.dir(data.moves);

      // Recreate all the game.
      for(var i=0; i<data.moves.length; i++)
      {
        if(data.moves[i] !== null)
        {
          // Just to send it not empty
          if(typeof data.moves[i].promotion === undefined)
          {
            data.moves[i].promotion = "q";
          }

          //console.log("Moving piece from " + data.moves[i].from + " to " + data.moves[i].to );
          movePiece(data.moves[i].from,data.moves[i].to, data.moves[i].promotion, true);
        }
      }

    }

  });


  $socket.on('move', function (data) {

    if(typeof data.move !== undefined && data !== null)
    {
      console.log('I just received move');
      console.dir(data);

      movePiece(from=data.move.from, to=data.move.to, promotion=data.move.promotion, rcvd=true);

      if (typeof document.hidden === undefined) return;
      if (document.hidden) {
        var title = $('title').text();
        countHiddenMoves++;

        console.log(title);
        var titlePlusCount = title.replace(/\(\d\)/g, "(" + countHiddenMoves + ")");
        console.log(titlePlusCount);
        $('title').text(titlePlusCount);

        $(window).on('focus', removeHiddenCount);

        function removeHiddenCount(e) {
          countHiddenMoves = 0;

          var titleRemovedCount = title.replace(/\(\d\)/g, "");

          $('title').text(titleRemovedCount);
          $(window).off('focus', removeHiddenCount);
        }
      }
    }
   
  });

  $socket.on('opponent-disconnected', function (data) {
    console.log("One opponent disconnected");
    // TO-DO One opponent disconnected

    /* $('.resign').off().remove();
    

    $('.sendMessage').off();
    $('.sendMessage').submit(function (e) {
      e.preventDefault();
      showModal("Your opponent has disconnected. You can't send messages.");
    });
    $('.rematch').off();
    $('.rematch').click(function (e) {
      e.preventDefault();
      showModal('Your opponent has disconnected. You need to generate a new link.');
    })

    if (!$gameOver) {
      showModal("Your opponent has disconnected.");
    }*/
  });

  $socket.on('player-resigned', function (data) {
   /* $gameOver = true;
    $('.resign').hide();
    $('.rematch').show();
    unbindMoveHandlers();
    var winner = data.color === 'w' ? 'Black' : 'White';
    var loser = data.color === 'w' ? 'White' : 'Black';
    var message = loser + ' resigned. ' + winner + ' wins.';
    showModal(message);
    $('.feedback-move').text('');
    $('.feedback-status').text(message);*/
  });

  $socket.on('receive-players', function (data) {
    drawPlayers(data.players);
  });

  function drawPlayers(players)
  {
    console.log("Received players");
    console.dir(players);

    var blackPlayers = _.where(players, { 'color': 'black' } );
    var whitePlayers = _.where(players, { 'color': 'white' } );

    $('h4.black.cnt > span.count_players').text(blackPlayers.length);
    $('h4.white.cnt > span.count_players').text(whitePlayers.length);

    if(whitePlayers.length > 1)
    {
      $('h4.white.cnt > span.count_players_phrase').text(' players for white');
    }
    else
    {
      $('h4.white.cnt > span.count_players_phrase').text(' player for white');
    }

    if(blackPlayers.length > 1)
    {
      $('h4.black.cnt > span.count_players_phrase').text(' players for black');
    }
    else
    {
      $('h4.black.cnt > span.count_players_phrase').text(' player for black');
    }
    
    var $whiteUL =  $('ul.player_holder.white');
    var $blackUL =  $('ul.player_holder.black');
    
    $whiteUL.empty();
    $blackUL.empty();

    drawPlayers($whiteUL, whitePlayers);
    drawPlayers($blackUL, blackPlayers);
    
    function drawPlayers(ul, array)
    {
      for(var i=0; i< array.length; i++)
      {
        var admin = false;
        var adminTag = "";

        if(array[i].admin === true)
        {
          admin = true;
          adminTag = "@";
        }

        ul.append('<li>'+array[i].name+' '+adminTag+'<span class="lastMove">'+array[i].lastMove+'</span></li>')
      }
    }
  }

  $socket.on('full', function (data) {
    alert("This game already has two players. You have to create a new one.");
    window.location = '/';
  });

  $socket.on('receive-message', function (data) {

    var chat;

    if(data.color == 'white')
    {
      chat = $('ul.white#chat');
    }
    else
    {
      chat = $('ul.black#chat');
    }

    var chat_node = $('ul#chat')[0];
    var messageSnd = $("#messageSnd")[0];



    chat.append('<li class="' + data.color + ' left" ><span class="username">' + escapeHTML(data.username) + '</span> ' + escapeHTML(data.message) + '</li>');

    if (chat.is(':visible') && chat_node.scrollHeight > 300) {
      setTimeout(function() { chat_node.scrollTop = chat_node.scrollHeight; }, 50);
    } else if (!chat.is(':visible') && !$('.new-message').is(':visible')) {
      $('#bubble').before('<span class="new-message">You have a new message!</span>');
    }

    if ($('#sounds').is(':checked')) {
      messageSnd.play();
    }
  });

  $socket.on('countdown', function (data) {
    var color = data.color;
    var opp_color = color === 'black' ? 'white' : 'black';
    var min = Math.floor(data.time / 60);
    var sec = data.time % 60;
    if (sec.toString().length === 1) {
      sec = '0' + sec;
    }
    
    $('.clock li.' + color).text(min + ':' + sec);
  });

  $socket.on('countdown-gameover', function (data) {
    $gameOver = true;
    unbindMoveHandlers();
    var loser = data.color === 'black' ? 'Black' : 'White';
    var winner = data.color === 'black' ? 'White' : 'Black';
    var message = loser + "'s time is out. " + winner + " wins.";
    $('.resign').hide();
    $('.rematch').show();
    showModal(message);
    $('.feedback-move').text('');
    $('.feedback-status').text(message);
  });

  $socket.on('rematch-offered', function (data) {
    hideModal();
    showOffer('Your opponent sent you a rematch offer.', {
      accept: rematchAccepted,
      decline: rematchDeclined
    });
  });

  $socket.on('rematch-declined', function (data) {
    showModal('Rematch offer was declined.');
  });

  $socket.on('rematch-confirmed', function (data) {
    hideModal();
    $side = $side === 'w' ? 'b' : 'w'; //swap sides
    $piece = null;
    $chess = new Chess();
    $gameOver = false;

    $('.clock li').each(function () {
      $(this).text($time + 's');
    });

    if ($('.clock li.black').hasClass('ticking')) {
      $('.clock li.black').removeClass('ticking');
      $('.clock li.white').addClass('ticking');
    }

    $('#moves tbody tr').empty();
    $('#captured-pieces ul').each(function () {
      $(this).empty();
    })

    $('.rematch').hide();
    $('.resign').show();

    // Restart the boards to the starting position!
    if ($side === 'w') {
      $('.chess_board.black').remove();
      $('#board_wrapper').append($chessboardWhite.clone());
 

    } else {
      $('.chess_board.white').remove();
      $('#board_wrapper').append($chessboardBlack.clone());
      $('.chess_board.black').show();
    }
    
    $socket.emit('start-timer', {
      'token': $token
    });

    bindMoveHandlers();
    $('.sendMessage').find('input').removeClass('white black').addClass($side === 'b' ? 'black' : 'white');
  });

  /* gameplay */

  $('.clock li').each(function() {
    $(this).text($time+'s');
  });
  
  // $('#game-type').text($time + '|' + $increment);

  function movePieceFromHandler(e) {
    var piece = $(this);
    if ((piece.hasClass('white') && $side !== 'w') ||
        (piece.hasClass('black') && $side !== 'b')) {
      if ($piece) {
        movePiece(
          from=$piece.parent().data('id').toLowerCase(),
          to=$(this).parent().data('id').toLowerCase(),
          promotion=$('#promotion option:selected').val()
        );
      }
    } else {
      if ($chess.turn() !== $side) {
        return false;
      }

      if (e && $piece && isSelected($(this).parent())) {
        unselectPiece($piece.parent());
        $piece = null;
      } else {
        if ($piece) {
          unselectPiece($piece.parent());
          $piece = null;
        }
        $piece = $(this);
        selectPiece($piece.parent());
      }
    }

    if (e) { // only on click event, not drag and drop
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  }

  function movePieceToHandler(e) {
    if ($piece) {
      movePiece(
        from=$piece.parent().data('id').toLowerCase(),
        to=$(this).data('id').toLowerCase(),
        promotion=$('#promotion option:selected').val()
      )
    }
  }

  bindMoveHandlers();

  function dndSupported() {
    return 'draggable' in document.createElement('span');
  }

  function dragstartHandler(e) {
    var el = $(this);
    $drgSrcEl = el;
    $drgSrcEl.parent().addClass('moving');
    e.originalEvent.dataTransfer.effectAllowed = 'move';
    e.originalEvent.dataTransfer.setData('text/html', el.html());
    movePieceFromHandler.call(this, undefined);
  }

  function dropHandler(e) {
    e.stopPropagation();
    e.preventDefault();
    movePieceToHandler.call(this, undefined);
  }

  $('#modal-mask, #modal-ok').click(function (e) {
    e.preventDefault();
    hideModal();
  });

  // $('#offer-accept').click(function (e) {
  //   e.preventDefault();
  //   hideOffer();
  //   rematchAccepted();
  // });

  // $('#offer-decline').click(function (e) {
  //   e.preventDefault();
  //   hideOffer();
  //   rematchDeclined();
  // });

  $('#modal-window, #offer-window').click(function (e) {
    e.stopPropagation();
  });

  // $('.resign').click(function (e) {
  //   e.preventDefault();

  //   $socket.emit('resign', {
  //     'token': $token,
  //     'color': $side
  //   });
  // });

  // $('.rematch').click(function (e) {
  //   e.preventDefault();
  //   showModal('Your offer has been sent.');

  //   $socket.emit('rematch-offer', {
  //     'token': $token
  //   });
  // })

  $('a.chat').click(function (e) {
    $('.new-message').remove();
    var chat_node = $('ul#chat')[0];
    if (chat_node.scrollHeight > 300) {
      setTimeout(function() { chat_node.scrollTop = chat_node.scrollHeight; }, 50);
    }
  });

  $('.sendMessage').submit(function (e) {
    e.preventDefault();
    var input = $(this).find('input');
    var message = input.val();
    var color = $side === 'b' ? 'black' : 'white';
    var chat;

    if(color == 'white')
    {
      chat = $('ul.white#chat');
    }
    else
    {
      chat = $('ul.black#chat');
    }

    if (!/^\W*$/.test(message)) {
      input.val('');
      chat.append('<li class="' + color + ' right" >' + escapeHTML(message) + '</li>');

      var chat_node = $('ul#chat')[0];
      if (chat_node.scrollHeight > 300) {
        setTimeout(function() { chat_node.scrollTop = chat_node.scrollHeight; }, 50);
      }

      $socket.emit('send-message', {
        'message': message,
        'color': color,
        'token': $token
      });
    }
  });

});
