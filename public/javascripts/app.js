var $URL, $socket;
  
$(function () {
  //var ENV = 'openshift';
  var ENV = 'dev';
  var $WS;

  if (ENV === 'dev') {
    $URL = 'http://simultaneouschess.herokuapp.com:3000';
    $WS = $URL;
  } else if (ENV === 'openshift') {
    $URL = 'http://simultaneouschess.herokuapp.com/';
    $WS = 'http://simultaneouschess.herokuapp.com:8000/';
  }

  $socket = io.connect($WS);
});