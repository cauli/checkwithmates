// config/passport.js

// load all the things we need
var LocalStrategy   = require('passport-local').Strategy,
    FacebookStrategy = require('passport-facebook').Strategy;

var ConnectionManager = require('./ConnectionManager');
var User = require('./User');
var mysql = require('mysql');
// load up the user model

var bcrypt = require('bcrypt-nodejs');





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
        ConnectionManager.pool.getConnection(function (err, connection) {

            if (err) {
                return done(err);
            }

            connection.query("select * from users where id = " + id, function (err, rows) {

                connection.release();

                if (err) {
                    return done(err);
                }
                if (rows.length) {
                    done(err, rows[0]);
                }
            });
        });
    });

    // =========================================================================
    // FACEBOOK LOGIN ==========================================================
    // =========================================================================
    passport.use(new FacebookStrategy({
        clientID: "1519137431693479",
        clientSecret: "aca75efcc56b7b0abc9dbb49c81d3bf9",
        callbackURL: "http://checkwithmates.com/auth/facebook/callback" //"http://www.checkwithmates.com/auth/facebook/callback"
      },
      function(accessToken, refreshToken, profile, done) {
        console.dir(profile);

        var id = profile.id;
        var name = profile.displayName;
        var gender = profile.gender;

        var fbUser = {
            fb_id: id,
            username: name,
            name: name,
            gender: gender,
            password: null
        };

        ConnectionManager.pool.getConnection(function(err,connection) {
                connection.query("select * from users where fb_id = '" + id + "'", function (err, rows) {

                    connection.release();

                    if (err)
                        return done(err);
                    if (rows.length) {
                        console.log("Login message: fb_id already exists");

                        fbUser.id = rows[0].id;
                        return done(null, fbUser);
                    } else {
                        var insertQuery = "INSERT INTO users ( fb_id, gender, name, username ) values ('" + fbUser.fb_id + "','" + fbUser.gender + "','" + fbUser.name +  "','" + fbUser.username  +"')";

                        ConnectionManager.pool.getConnection(function(err,connection) {
                            connection.query(insertQuery, function (err, rows) {

                                if(err)
                                {
                                    console.dir(err);
                                    return done(null, false, req.flash('signupMessage', 'Database error'));
                                }

                                connection.release();

                                fbUser.id = rows.insertId;

                                User.setDefaultRating(fbUser.username, function (rating) {
                                    return done(null, fbUser);
                                });
                            });
                        });
                    }
                });
            });

        //return done(null, profile);
        /*User.findOrCreate(..., function(err, user) {
          if (err) { return done(err); }
          done(null, user);
        });*/
      }
    ));

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
            ConnectionManager.pool.getConnection(function(err,connection) {
                connection.query("select * from users where username = '" + username + "' or email = '" + email + "'", function (err, rows) {

                    connection.release();

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

                        console.log('!' + password + '!was hashed to ' + newUserMysql.password);


                        var insertQuery = "INSERT INTO users ( username, password, email ) values ('" + newUserMysql.username + "','" + newUserMysql.password + "','" + newUserMysql.email + "')";

                        ConnectionManager.pool.getConnection(function(err,connection) {
                            connection.query(insertQuery, function (err, rows) {
                                if (err)
                                {
                                    console.dir(err);
                                    return done(err);
                                }

                                connection.release();

                                newUserMysql.id = rows.insertId;

                                User.setDefaultRating(newUserMysql.username, function (rating) {
                                    return done(null, newUserMysql);
                                });
                            });
                        });
                    }
                });
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
            ConnectionManager.pool.getConnection(function(err,connection) {
                connection.query("select * from users where username = '" + username + "' OR email = '" + username +"'",function(err, rows){

                    connection.release();

                    if (err)
                        return done(err);
                    if (!rows.length) {
                        return done(null, false, req.flash('loginMessage', 'User was not found!')); // req.flash is the way to set flashdata using connect-flash
                    }

                    // if the user is found but the password is wrong
                    if (!bcrypt.compareSync(password, rows[0].password))
                    {
                        return done(null, false, req.flash('loginMessage', 'Wrong password!')); // create the loginMessage and save it to session as flashdata
                    }

                    // all is well, return successful user
                    return done(null, rows[0]);
                });
            });
        })
    );
};