
var dbconfig    = require('./database');
var mysql = require('mysql');


exports.pool = mysql.createPool(dbconfig.connection);

exports.pool.on('enqueue', function () {
    console.log('Waiting for available connection slot');
});

exports.pool.on('connection', function (connection) {
    connection.query('USE ' + dbconfig.database);
});

/*exports.connection = mysql.createConnection(dbconfig.connection);
var connection = exports.connection;

connection.query('USE ' + dbconfig.database);*/


/*
pool.query('SELECT 1 + 1 AS solution', function(err, rows, fields) {
    if (err) throw err;

    console.log('The solution is: ', rows[0].solution);
});

function handleDisconnect() {
    connection = mysql.createConnection(dbconfig.connection); // Recreate the connection, since
                                                              // the old one cannot be reused.

    connection.connect(function(err) {              // The server is either down
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
    connection.on('error', function(err) {
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

handleDisconnect();*/