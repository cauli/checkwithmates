var ConnectionManager = require('./ConnectionManager');

exports.setGame = function (info, callback) {
    ConnectionManager.pool.getConnection(function(err,connection){
        // TODO prevent SQL injections
        connection.query("INSERT INTO games (result,termination,fen,mode,created_on,pgn) VALUES ("+info.result+",'"+info.termination+"','"+info.fen+"','"+info.mode+"',"+info.created_on+",'"+info.pgn+"')",function(err, info){

            connection.release();

            if (err) {
                console.log("Unable to set game error: " + err);
                return false;
            }
            
            return callback(info.insertId);
        });
    });
}