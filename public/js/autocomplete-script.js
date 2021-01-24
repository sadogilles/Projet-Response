$( function() {
    var availableTags = [
      "ActionScript",
      "AppleScript",
      "Asp",
      "BASIC",
      "C",
      "C++",
      "Clojure",
      "COBOL",
      "ColdFusion",
      "Erlang",
      "Fortran",
      "Groovy",
      "Haskell",
      "Java",
      "JavaScript",
      "Lisp",
      "Perl",
      "PHP",
      "Python",
      "Ruby",
      "Scala",
      "Scheme"
    ];

  

    $( "#search-input" ).autocomplete({
      source: availableTags
    });
  } );

  $(document).ready(()=>{
     
        //fetch data 
    $.get('./data.txt',  // url
    function (data, textStatus, jqXHR) {  // success callback
        alert('status: ' + textStatus+'data,'+data);
     });
  });