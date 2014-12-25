var $URL, $socket;
  
$(function () {
  var ENV = 'development';
  //var ENV = 'production';
  var $WS;

  if (ENV === 'production') {
    $URL = 'https://simultaneouschess.herokuapp.com';
    $WS = $URL;
  }
  else if(ENV == 'development') {
    $URL = 'http://localhost:3000';
    $WS = $URL;
  }

  $socket = io.connect($WS);
});