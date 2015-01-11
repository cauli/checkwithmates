
var dbconfig    = require('./database');
var mysql = require('mysql');

var conn = mysql.createConnection(dbconfig.connection);
exports.connection = conn;

conn.query('USE ' + dbconfig.database);

function handleDisconnect() {
    conn = mysql.createConnection(dbconfig.connection); // Recreate the connection, since
                                                              // the old one cannot be reused.

    conn.connect(function(err) {              // The server is either down
        if(err) {                                     // or restarting (takes a while sometimes).
            console.log('error when connecting to db:', err);
            setTimeout(handleDisconnect, 2000); // We introduce a delay before attempting to reconnect,
        }
        else
        {
            connection.query('USE ' + dbconfig.database);
        }                              // to avoid a hot loop, and to allow our node script to
    });                                     // process asynchronous requests in the meantime.
                                            // If you're also serving http, display a 503 error.
    conn.on('error', function(err) {
        console.log('db error', err);
        if(err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
            handleDisconnect();                         // lost due to either server restart, or a
        } else {
            handleDisconnect();
            console.log(err.code + ' - err.code');      // connnection idle timeout (the wait_timeout
            throw err;                                  // server variable configures this)
        }
    });
}

handleDisconnect();