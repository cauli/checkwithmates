// config/passport.js

// load all the things we need
var LocalStrategy   = require('passport-local').Strategy;

// load up the user model
var mysql = require('mysql');
var bcrypt = require('bcrypt-nodejs');
var dbconfig = require('./database');
var connection = mysql.createConnection(dbconfig.connection);

connection.query('USE ' + dbconfig.database);

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

handleDisconnect();

// expose this function to our app using module.exports
module.exports = function(passport) {

    // =========================================================================
    // passport session setup ==================================================
    // =========================================================================
    // required for persistent login sessions
    // passport needs ability to serialize and unserialize users out of session

    // used to serialize the user for the session
    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    // used to deserialize the user
    passport.deserializeUser(function(id, done) {
        connection.query("select * from users where id = "+ id, function(err, rows){
            done(err, rows[0]);
        });
    });

    // =========================================================================
    // LOCAL SIGNUP ============================================================
    // =========================================================================
    // we are using named strategies since we have one for login and one for signup
    // by default, if there was no name, it would just be called 'local'

    passport.use(
        'local-signup',
        new LocalStrategy({
            // by default, local strategy uses username and password, we will override with email
            usernameField : 'username',
            passwordField : 'password',
            passReqToCallback : true // allows us to pass back the entire request to the callback
        },
        function(req, username, password, done) {
            var email = req.body.email;

            if(!/^[a-z0-9\._-]{3,15}$/.test(username))
            {
                return done(null, false, req.flash('signupMessage', 'Username must be between 3 and 15 characters'));
            }

            if(!isValidEmail(email))
            {
                return done(null, false, req.flash('signupMessage', 'Invalid email'));
            }
            
            function isValidEmail(email)
            {
               return /^([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x22([^\x0d\x22\x5c\x80-\xff]|\x5c[\x00-\x7f])*\x22)(\x2e([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x22([^\x0d\x22\x5c\x80-\xff]|\x5c[\x00-\x7f])*\x22))*\x40([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x5b([^\x0d\x5b-\x5d\x80-\xff]|\x5c[\x00-\x7f])*\x5d)(\x2e([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x5b([^\x0d\x5b-\x5d\x80-\xff]|\x5c[\x00-\x7f])*\x5d))*$/.test( email );
            }

            // find a user whose email is the same as the forms email
            // we are checking to see if the user trying to login already exists
            connection.query("select * from users where username = '" + username + "' or email = '"+email+"'", function(err, rows) {
                if (err)
                    return done(err);
                if (rows.length) {
                    console.log("Signup Message: That username is already taken.");
                    return done(null, false, req.flash('signupMessage', 'Username or email already exists'));
                } else {
                    // if there is no user with that username
                    // create the user
                    var newUserMysql = {
                        username: username,
                        email: email,
                        password: bcrypt.hashSync(password, null, null)  // use the generateHash function in our user model
                    };

                    console.log('!'+password+'!was hashed to ' +newUserMysql.password);

                    var insertQuery = "INSERT INTO users ( username, password, email ) values ('" + newUserMysql.username + "','" + newUserMysql.password +  "','" + newUserMysql.email + "')";

                    connection.query(insertQuery,function(err, rows) {
                        newUserMysql.id = rows.insertId;
                        return done(null, newUserMysql);
                    });
                }
            });
        })
    );

    // =========================================================================
    // LOCAL LOGIN =============================================================
    // =========================================================================
    // we are using named strategies since we have one for login and one for signup
    // by default, if there was no name, it would just be called 'local'

    passport.use(
        'local-login',
        new LocalStrategy({
            // by default, local strategy uses username and password, we will override with email
            usernameField : 'username',
            passwordField : 'password',
            passReqToCallback : true // allows us to pass back the entire request to the callback
        },
        function(req, username, password, done) { // callback with email and password from our form
            console.log("passport logging in");

            console.log("trying to login " + username + ' password !' + password+ '!');
            connection.query("select * from users where username = '" + username + "' OR email = '" + username +"'",function(err, rows){
                if (err)
                    return done(err);
                if (!rows.length) {
                    console.log("Login Message: No user found.");
                    return done(null, false, req.flash('loginMessage', 'User was not found!')); // req.flash is the way to set flashdata using connect-flash
                }

                console.log(bcrypt.compareSync(password, rows[0].password));
                console.log( '!' + rows[0].password +  '! there password hashed ');
                


                // if the user is found but the password is wrong
                if (!bcrypt.compareSync(password, rows[0].password))
                {
                    return done(null, false, req.flash('loginMessage', 'Wrong password!')); // create the loginMessage and save it to session as flashdata
                }
                   
                // all is well, return successful user
                return done(null, rows[0]);
            });
        })
    );
};