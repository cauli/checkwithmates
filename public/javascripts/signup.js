(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','//www.google-analytics.com/analytics.js','ga');

ga('create', 'UA-58047511-1', 'auto');
ga('require', 'displayfeatures');
ga('send', 'pageview');


$(function () {
  $('#joinnow').click(function() {
      $( "#signup_form" ).submit();
  });

  $('.warn').addClass('warned');



  /********************************
  * Email usability/validity checks
  ********************************/

  var emailValue;
  var $email = $('#email')

  $email.keyup(function() 
  {
    emailValidate($email.val());
  });

  $email.blur(function() 
  {
    emailValidate($email.val());
  });

  $email.change(function() 
  {
    emailValidate($email.val());
  });

  var eValAllow = true;
  var eValidation;

  function emailValidate(passedValue)
  {
    if(eValAllow)
    {
      eValAllow = false;

      eValidation = setTimeout(function() {
        emailValue = passedValue;

        if(emailValue.length < 5)
        {
          $email.removeClass('valid');
          eValAllow = true;
          return;
        }

        var isValid = isValidEmail(emailValue);
        isValid ? $email.addClass('valid') : $email.removeClass('valid');

        eValAllow = true;
      }, 1000);
    }
  }

  function isValidEmail(email)
  {
    return /^([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x22([^\x0d\x22\x5c\x80-\xff]|\x5c[\x00-\x7f])*\x22)(\x2e([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x22([^\x0d\x22\x5c\x80-\xff]|\x5c[\x00-\x7f])*\x22))*\x40([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x5b([^\x0d\x5b-\x5d\x80-\xff]|\x5c[\x00-\x7f])*\x5d)(\x2e([^\x00-\x20\x22\x28\x29\x2c\x2e\x3a-\x3c\x3e\x40\x5b-\x5d\x7f-\xff]+|\x5b([^\x0d\x5b-\x5d\x80-\xff]|\x5c[\x00-\x7f])*\x5d))*$/.test( email );
  }

  /***********************************
  * Password usability/validity checks
  ************************************/

  var $password = $('#password');
  var $passwordConfirm = $('#password-confirm');

  var passwordWarnMessage = "";

  $passwordConfirm.keyup(function() 
  {
    checkPasswordsMatch();
  });

  $password.keyup(function() 
  {
    checkPasswordsMatch();
  });

  $passwordConfirm.change(function() 
  {
    checkPasswordsMatch();
  });

  $password.change(function() 
  {
    checkPasswordsMatch();
  });

  $passwordConfirm.blur(function() 
  {
    checkPasswordsMatch();
  });

  $password.blur(function() 
  {
    checkPasswordsMatch();
  });


  function checkPasswordsMatch() {
    var first = $password.val();
    var second = $passwordConfirm.val();


    if(first !== second)
    {
      $passwordConfirm.addClass('invalid');

      $passwordConfirm.removeClass('valid');
      $password.removeClass('valid');

      passwordWarnMessage = "Passwords don't match!";
    }
    else
    {
      if(first.length < 4)
      {
        $password.addClass('invalid');
        $passwordConfirm.addClass('invalid');

        passwordWarnMessage = "Password must have more than 4 characters";
      }
      else
      {
        // Everything ok!
        passwordWarnMessage = "";

        $passwordConfirm.addClass('valid');
        $password.addClass('valid');
        $passwordConfirm.removeClass('invalid');
        $password.removeClass('invalid');
      }
    }
  }


  /************************************
  * Username usability/validity checks
  ************************************/

  var $username = $('#username');

  $username.keyup(function() 
  {
    userValidate();
  });

  $username.blur(function() 
  {
    userValidate();
  });

  $username.change(function() 
  {
    userValidate();
  });

  function userValidate() {
    var user = $username.val();

    if(/^[a-z0-9\._-]{3,15}$/.test(user) )
    {
      $username.addClass('valid');
    }
    else
    {
      $username.removeClass('valid');
    }
  }



  /***********************************
  * Join now usability/validity checks
  ************************************/

  $('#username, #password, #password-confirm, #email').keyup(function() 
  {   
    if($username.hasClass('valid') && $password.hasClass('valid') && $email.hasClass('valid'))
    {
      $('#joinnow').removeClass('disabled');
    }
    else
    {
      $('#joinnow').addClass('disabled');
    }
  });

});
