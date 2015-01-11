var ConnectionManager = require('./ConnectionManager');

var emailconfig = require('./email')
var nodemailer =  require('nodemailer');
var transporter = nodemailer.createTransport(emailconfig);


exports.forgot = function(username, req, res, redirectTo){
    ConnectionManager.connection.query("select * from users where username = '" + username + "' OR email = '" + username +"'",function(err, rows){
        if (err) {
            console.log("Unknown error!");
            req.flash('forgotMessage', 'Unknown error!');
            res.render(redirectTo, {message: req.flash('forgotMessage')});
            res.end();
            return true;
        }
        if (!rows.length) {
            console.log("User not found!");
            req.flash('forgotMessage',"User not found!");
            res.render(redirectTo, { message: "User not found" });
            console.log("Rendered view");
            res.end();
            return true;
        }

        var personEmail = rows[0].email;

        console.log(personEmail + " asked for forgot email")

        // TODO just a stub for email
        var mailOptions = {
            from: 'Check With Mates <checkwithmates@cau.li>', // sender address
            to: personEmail,
            subject: 'Reset your password',
            text: 'Hello from Check With Mates. It looks like you forgot your email. Please go to this link to reset it :  ',
            html: '<b>Hello from Check With Mates.</b>It looks like you forgot your email. Please go to this link to reset it : Didn\'t send this message? You can either ignore this message or cancel the account associated with this email'
        };

        // send mail with defined transport object
        transporter.sendMail(mailOptions, function(error, info) {
            if (error) {
                req.flash('forgotMessage', 'There was an error sending the email')
                res.render(redirectTo, { message:  req.flash('forgotMessage') });
                res.end();
                console.log('There was an error sending the email');
                console.log(error);
                return false;
            } else {
                console.log('Message sent: ' + info.response);
            }
        });

        req.flash('forgotMessage', 'Reset email sent with success!');
        res.render(redirectTo, { message:  req.flash('forgotMessage') });
        res.end();
        console.log("Requested forgot for email");

        return true;
    });
}
