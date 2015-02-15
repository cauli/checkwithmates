var ConnectionManager = require('./ConnectionManager');

//create object with K-Factor(without it defaults to 32)
var elo = require('elo-rank')(15);

var defaultRating = 1500;


exports.setDefaultRating = function (username, callback) {
    var _this = this;

    _this.getId(username, function(id) {;
        ConnectionManager.pool.getConnection(function(err,connection){
            connection.query("INSERT INTO rating (id,rating) VALUES ("+id+","+defaultRating+")",function(err, rows){

                connection.release();

                if (err) {
                    console.log("Unable to set default rating for " + username + " error: " + err);
                    return false;
                }

                console.log("New rating for "+ username + " was set with success to " + defaultRating);

                return callback(defaultRating);
            });
        });
    });
}

exports.setNewRating = function (username, opponentRating, result, gameId) {

    var _this = this;

    _this.getId(username, function(id) {
        _this.getRatingById(id, function (rating) {

            // Get username rating
            var playerRating = rating;

            //Gets expected score for first parameter
            var expectedScoreA = elo.getExpected(playerRating,opponentRating);
            var expectedScoreB = elo.getExpected(opponentRating,playerRating);

            //update score, 1 if won 0 if lost
            var newPlayerRating = elo.updateRating(expectedScoreA,result,playerRating);
            //opponentRating = elo.updateRating(expectedScoreB,result,opponentRating);

            console.log("New player rating = " + newPlayerRating);


            ConnectionManager.pool.getConnection(function(err,connection){
                connection.query("INSERT INTO rating (id,rating,game_id) VALUES ("+id+","+newPlayerRating+","+gameId+")",function(err, rows){

                    connection.release();

                    if (err) {
                        console.log("Unable to set new rating for " + username + " error: " + err);
                        return false;
                    }

                    console.log("New rating for "+ username + " was set with success to " + newPlayerRating);
                });
            });
        });
    });
}

exports.getId = function (username, callback) {
    ConnectionManager.pool.getConnection(function(err,connection){
        connection.query("select id from users where username = '" + username + "' OR email = '" + username +"'",function(err, rows){

            connection.release();

            if (err)
            {
                console.log("Unable to get ID for " + username);
                return false;
            }
            if (!rows.length) {
                console.log("Username not found");
                return false;
            }

            var id = rows[0].id;

            return callback(id);
        });
    });
}

exports.getUsername = function (id, callback) {
    ConnectionManager.pool.getConnection(function(err,connection){
        connection.query("select username from users where id = " + id + "'",function(err, rows){

            connection.release();

            if (err)
            {
                console.log("Unable to get username for " + id);
                return false;
            }
            if (!rows.length) {
                console.log("Username not found");
                return false;
            }

            var username = rows[0].username;

            return callback(username);
        });
    });
}

exports.getRatingById = function (id, callback) {
    ConnectionManager.pool.getConnection(function(err,connection){
        connection.query("select * from rating where id = " + id + " ORDER BY timestamp DESC LIMIT 1",function(err, rows){

            connection.release();

            if (err)
            {
                console.log("Unable to get rating (getRatingById) for " + id + " error : " + err);
                return false;
            }
            var latestRating

            if (!rows.length) {
                console.log("Rating for " + id + " not found");
                latestRating = -1;
            }
            else
            {
                latestRating = rows[0].rating;
            }


            return callback(latestRating);
        });
    });
}

exports.setUserPlayed = function(username, info, callback) {
    this.getId(username, function(userId) {
        ConnectionManager.pool.getConnection(function(err,connection) {
            connection.query("insert into user_played (user_id, game_id, accepted_moves, rejected_moves, nonplayed_moves, color,admin, game_result, player_result) VALUES (" + userId + "," + info.game_id + ",0,0,0,'" + info.color + "','" + info.admin + "'," + info.result + ","+ info.player_result+")", function (err, rows) {
                connection.release();

                if (err) {
                    console.log("Unable to setUserPlayed: " + err);
                    return false;
                }

                return callback("ok");
            });
        });
    });
}


exports.getGameResultsHistory = function(username, callback) {
    this.getId(username, function(id) {
        ConnectionManager.pool.getConnection(function(err,connection){
            connection.query("select * from user_played where user_id = " + id + " LIMIT 2000",function(err, rows){

                connection.release();

                var allResultHistory   = {'won':0,'lost':0,'drawn':0};
                var whiteResultHistory = {'won':0,'lost':0,'drawn':0};
                var blackResultHistory = {'won':0,'lost':0,'drawn':0};

                if (err)
                {
                    console.log("Unable to get game results (getGameResultsHistory) for " + id + " error : " + err);
                    return false;
                }

                if (!rows.length) {
                    console.log("User has no game history : " + id + "");
                    // return({'error':'User has not played any games!'});
                }
                else
                {
                    for(var i=0; i<rows.length; i++)
                    {
                        if(rows[i].PLAYER_RESULT == 1)
                        {
                            allResultHistory.won += 1;

                            if(rows[i].COLOR == 'white')
                            {
                                whiteResultHistory.won += 1;
                            }
                            else
                            {
                                blackResultHistory.won += 1;
                            }
                        }
                        else if(rows[i].PLAYER_RESULT == 0)
                        {
                            allResultHistory.drawn += 1;

                            if(rows[i].COLOR == 'white')
                            {
                                whiteResultHistory.drawn += 1;
                            }
                            else
                            {
                                blackResultHistory.drawn += 1;
                            }
                        }
                        else if(rows[i].PLAYER_RESULT == -1)
                        {
                            allResultHistory.lost += 1;

                            if(rows[i].COLOR == 'white')
                            {
                                whiteResultHistory.lost += 1;
                            }
                            else
                            {
                                blackResultHistory.lost += 1;
                            }
                        }
                        else
                        {
                            console.log("error getting row for results");
                            console.log(rows[i]);
                        }
                    }
                }

                var response = {
                    'all' : allResultHistory,
                    'white' : whiteResultHistory,
                    'black':  blackResultHistory
                }

                return callback(response);
            });
        });
    });
}

/* Gets latest 150 ratings of user */
exports.getRatingHistory = function (username, callback) {
    this.getId(username, function(id) {
        ConnectionManager.pool.getConnection(function(err,connection){
            connection.query("select * from rating where id = " + id + " ORDER BY timestamp ASC LIMIT 150",function(err, rows){

                connection.release();

                var history = [];

                if (err)
                {
                    console.log("Unable to get rating history (getRatingHistory) for " + id + " error : " + err);
                    return false;
                }

                if (!rows.length) {
                    console.log("Rating History for " + id + " not found");

                }
                else
                {
                    for(var i=0; i<rows.length; i++)
                    {
                        history.push(rows[i].rating.toString());
                    }
                }

                return callback(history);
            });
        });
    });
}

exports.getRatingByUser = function (username, callback) {
    this.getId(username, function(id) {
        ConnectionManager.pool.getConnection(function(err,connection){
            connection.query("select * from rating where id = " + id + " ORDER BY timestamp DESC LIMIT 1",function(err, rows){

                connection.release();

                if (err)
                {
                    console.log("Unable to get rating (getRatingByUser) for " + id + " error : " + err);
                    return false;
                }

                var latestRating

                if (!rows.length) {
                    console.log("Rating for " + id + " not found");
                    latestRating = -1;
                }
                else
                {
                    latestRating = rows[0].rating;
                }

                return callback(latestRating);
            });
        });
    });
}


