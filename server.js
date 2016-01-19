var   express = require('express'),
      fs = require('fs'),
      cheerio = require('cheerio'),
      request = require('request'),
      path = require('path'),
      bodyParser = require('body-parser'),
      db = require('./database'),
      app = express();

app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, './bootstrap-3.3.6-dist/css')));
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true }));

// Tags
var latestBlockChainJsonURL = "https://blockchain.info/fr/latestblock";
var getHashByHeightURL = "https://blockexplorer.com/api/block-index/";

app.get('/', function (req, res) {
    var url = latestBlockChainJsonURL;
    var lastBlock = { height : "", hash : "", time : ""};

    var req = request(url, function(error, response, html){ // ! async !
          if(!error){
                var jsonResult = JSON.parse(html);
                lastBlock.height = jsonResult.height;
                lastBlock.hash = jsonResult.hash;
                lastBlock.time = jsonResult.time;


                // fill the accueil view and send it !
                fs.readFile('./views/accueil.html','utf8', function (err, html) {
                     if (err) {
                         throw err;
                     }
                     else {
                       res.contentType('text/html');
                       $ = cheerio.load(html);
                       $('.blockHeight').text("#"+lastBlock.height.toString());
                       $('.blockHash').text(lastBlock.hash.toString());
                       $('#blockHeight').val(lastBlock.height.toString());
                       $('#blockHash').val(lastBlock.hash.toString());
                       res.send($.html());
                     }
                 });
          }
    }); // end html request

}); // end app.get

// receiving the new bet
app.post('/', function(req, res) {

  /// SHOW RESULTS FOR SINGLE PLAYER
    if(req.body.pari.toString() === "" && req.body.nom.toString() !== "" && req.body.prenom.toString() !== "") {

     db.checkForWin(function(){

          db.getRecordsForPlayer(req.body.nom.toString(), req.body.prenom.toString(), null, function(results) {

            fs.readFile('./views/myresults.html','utf8', function (err, html) {
                 if (err) {
                     throw err;
                 }
                 else {
                   res.contentType('text/html');
                   $ = cheerio.load(html);
                   $('.player').text(req.body.nom.toString() + " " + req.body.prenom.toString());

                  for(var i = 0 ; i < results.records.length; i++) {
                    // need to update the value if known
                    $('.bets' ).append('<li>Block #'+ results.records[i].blockHeight +' <-> résultat : '+results.records[i].win + ' (avec comme pari : ' + results.records[i].pari + ')</li>');

                  } // end for each records
                   res.send($.html());
                 }
             }); // end readfile
          }); // end getRecordsForPlayer (DB)
        }); // end check for win
    }

// TO SAVE A BET

        else{ // si le champ pari A été rempli
            var record = {};
            record.blockHeight = req.body.blockHeight.toString();
            record.nom = req.body.nom.toString();
            record.prenom = req.body.prenom.toString();
            record.pari= req.body.pari.toString();
            record.blockHash = req.body.blockHash.toString();
            record.win = -1;

            res.contentType('text/html');
          if(record.pari.length === 5 && record.nom.length !== 0 && record.prenom.length !== 0  ){
                  //saving
                db.saveBet(record, function(success){

                  if(success){
                    res.write("Thank you "+record.prenom+", your bet has been saved ! \n");
                    res.write("<a href=\"/\">Go Back</a>");
                  }
                  else{
                    res.write("Sorry you can't bet several times for the same Block !");
                  }
                  res.end();
                }); // end db save
          }
          else {

            res.write("Becareful with your fields ! note that The number of digits for the bet must be 5 ");
            res.end();
          }

        }


 });



app.get('/gains', function(req, res){

fs.readFile('./views/gains.html','utf8', function (err, html) {
 res.send(html);
});
});



var server = app.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});
