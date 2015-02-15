var dbconfig    = require('./database');
var mysql = require('mysql');

exports.pool = mysql.createPool(dbconfig.connection);

exports.pool.on('enqueue', function () {
    console.log('Waiting for available connection slot');
});

exports.pool.on('connection', function (connection) {
    connection.query('USE ' + dbconfig.database);
});