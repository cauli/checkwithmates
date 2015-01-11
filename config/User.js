var ConnectionManager = require('./ConnectionManager');

//create object with K-Factor(without it defaults to 32)
var elo = require('elo-rank')(15);

exports.setNewRating = function (username, opponentRating, won) {

    var _this = this;

    var result = won ? 1 : 0;

    _this.getId(username, function(id) {
        _this.getRatingById(id, function (rating) {

            // Get username rating
            var playerRating = rating;

            //Gets expected score for first parameter
            var expectedScoreA = elo.getExpected(playerRating,opponentRating);
            var expectedScoreB = elo.getExpected(opponentRating,playerRating);

            //update score, 1 if won 0 if lost
            var newPlayerRating = elo.updateRating(expectedScoreA,result,playerRating);
            opponentRating = elo.updateRating(expectedScoreB,result,opponentRating);

            ConnectionManager.connection.query("INSERT INTO rating (id,rating) VALUES ("+id+","+newPlayerRating+")",function(err, rows){
                if (err) {
                    console.log("Unable to set new rating for " + username + " error: " + err);
                    return false;
                }

                console.log("New rating for "+ username + " was set with success to " + newPlayerRating);
            });
        });
    });
}

exports.getId = function (username, callback) {
    ConnectionManager.connection.query("select id from users where username = '" + username + "' OR email = '" + username +"'",function(err, rows){
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
}

exports.getUsername = function (id, callback) {
    ConnectionManager.connection.query("select username from users where id = " + id + "'",function(err, rows){
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
}

exports.getRatingById = function (id, callback) {
    ConnectionManager.connection.query("select * from rating where id = " + id + " ORDER BY timestamp DESC LIMIT 1",function(err, rows){
        if (err)
        {
            console.log("Unable to get rating for " + id + " error : " + err);
            return false;
        }
        if (!rows.length) {
            console.log("Rating for " + id + " not found");
            return false;
        }

        var latestRating = rows[0].rating;

        return callback(latestRating);
    });
}

exports.getRatingByUser = function (username, callback) {
    this.getId(username, function(id) {
        ConnectionManager.connection.query("select * from rating where id = " + id + " ORDER BY timestamp DESC LIMIT 1",function(err, rows){
            if (err)
            {
                console.log("Unable to get rating for " + id + " error : " + err);
                return false;
            }
            if (!rows.length) {
                console.log("Rating for " + id + " not found");
                return false;
            }

            var latestRating = rows[0].rating;

            return callback(latestRating);
        });
    });
}