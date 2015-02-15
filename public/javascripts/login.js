/////////////////////////
// ANALYTICS ////////////
/////////////////////////

(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','//www.google-analytics.com/analytics.js','ga');

ga('create', 'UA-58047511-1', 'auto');
ga('require', 'displayfeatures');
ga('send', 'pageview');

/////////////////////////
// FACEBOOK /////////////
/////////////////////////

/*(function(d, s, id){
   var js, fjs = d.getElementsByTagName(s)[0];
   if (d.getElementById(id)) {return;}
   js = d.createElement(s); js.id = id;
   js.src = "//connect.facebook.net/en_US/sdk.js";
   fjs.parentNode.insertBefore(js, fjs);
 }(document, 'script', 'facebook-jssdk'));*/


$(function () {

  /*window.fbAsyncInit = function() {
    FB.init({
      appId      : '1519137431693479',
      xfbml      : true,
      version    : 'v2.2'
    });

    if (typeof facebookInit == 'function') {
        facebookInit();
    }
  };

  var facebookMessage = null;

  // This is called with the results from from FB.getLoginStatus().
  function loginCallback(response) {
    console.log('statusChangeCallback');
    console.log(response);

    if (response.status === 'connected') {
      connectedCallback();
    } else if (response.status === 'not_authorized') {
      facebookMessage = "We need your permission to login with Facebook";
    } else {
      facebookMessage = "Could not login with Facebook";
    }
  }

  function connectedCallback()
  {
    FB.api('/me', function(response) {
      $.post( "/fblogin", response)
            .done(function( data ) 
            {
              alert( "Data Loaded: " + data );
            });
    });
  }
*/
  /*$('#facebook-login').click(function() {
    FB.login(function(response){
      loginCallback(response);
    });
  });*/

  $('#login-button').click(function() {
      $( "#login_form" ).submit();
  });

  $("input").keypress(function(event) {
      if (event.which == 13) {
          event.preventDefault();
          $( "#login_form" ).submit();
      }
  });

  $('.warn').addClass('warned');
});