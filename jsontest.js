var express = require('express');
var fs = require('fs');
var app = express();

app.get('/json', function(req, res) {
  fs.readFile('./web-files/compiled.js', function(err, data) {
    res.json({"compiled.js": data.toString()});
  });
});

app.listen(3000);
//adsfasdf asdfaf asdf asasf asdfasdfaskljfkljasf ajsdlfkjsaA
//
//asdfdsasdfjdksaljfasdfafasdfasdfdsasfasdfasdfasdfasdfasdfasdfadsfasdf
//.asdfasdfadsfasdfasdfadsfasdfasdfafasdf asdf