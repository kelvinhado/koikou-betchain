var   express = require('express'),
      fs = require('fs'),
      cheerio = require('cheerio'),
      request = require('request'),
      path = require('path'),
      bodyParser = require('body-parser'),
      db = require('./database'),
      app = express();

app.set('views', path.join(__dirname, 'views'));
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
                    $('.bets' ).append('<li>Block #'+ results.records[i].blockHeight +' <-> '+results.records[i].win + ' (avec comme pari : ' + results.records[i].pari + ')</li>');

                  } // end for each records
                   res.send($.html());
                 }
             }); // end readfile
          }); // end getRecordsForPlayer (DB)

        }

// TO SAVE A BET

        else{ // si le champ pari A été rempli
            var record = {};
            record.blockHeight = req.body.blockHeight.toString();
            record.nom = req.body.nom.toString();
            record.prenom = req.body.prenom.toString();
            record.pari= req.body.pari.toString();
            record.blockHash = req.body.blockHash.toString();
            record.win = "pending";

            //saving
          db.saveBet(record, function(success){
            res.contentType('text/html');
            if(success){
              res.write("Thank you "+record.prenom+", your bet as been saved ! \n");
              res.write("<a href=\"/\">Go Back</a>");
            }
            else{
              res.write("Sorry you can't bet several times for the same Block !");
            }
            res.end();
          });

        }


 });



app.get('/gains', function(req, res){

fs.readFile('./views/gains.html','utf8', function (err, html) {
 res.send(html);
});
});




app.get('/results', function(req, res){

  /* Display results here */
  var blockHeight = req.query.id;

      if(req.query.id !== null) {

              // var blockHeightPlusDeux =  parseInt(req.query.id) + 2;
              // var url = getHashByHeightURL + blockHeightPlusDeux;
              // // get the block + 2 hash if avaiable in bdd
              // db.checkBlockPlusDeuxIssetInDB(req.query.id, /////){
              //
              // }



              var req = request(url, function(error, response, html){ // ! async !
                    if(!error){
                      var hashPlusDeux = 0;
                      var resultBin;
                        if(html != "Bad Request") {
                            var jsonResult = JSON.parse(html);
                            hashPlusDeux = jsonResult.blockHash;
                            var resultHex = hashPlusDeux.slice(-2);
                            resultBin = parseInt(resultHex,16).toString(2);
                          }
                          else{
                            console.log("error BAD request#33");
                          }

                            fs.readFile('./views/resultat.html','utf8', function (err, html) {
                                 if (err) {
                                     throw err;
                                 }
                                 else {
                                   res.contentType('text/html');
                                   $ = cheerio.load(html);
                                   $('.blockHeight').text("#"+blockHeight.toString());
                                   $('.blockHash').text(blockHeight.toString());

                                   if(hashPlusDeux === 0 ) {
                                      $('.block2Height').text("pending (...)");
                                      $('.block2Hash').text("waiting..");
                                  }
                                  else {
                                    $('.block2Height').text("#"+blockHeightPlusDeux.toString());
                                    $('.block2Hash').text(hashPlusDeux + "\n >> " + resultBin.slice(-5));
                                  }

                                  // display saved bets
                                  // get bets ni our data
                                  var data = JSON.parse(fs.readFileSync('./data.json', 'utf8'));
                                  for(var i = 0 ; i < data.records.length; i++) {
                                      if(data.records[i].blockHeight === blockHeight){
                                         if(hashPlusDeux !== 0){
                                              if(resultBin.slice(-5) == data.records[i].pari) {
                                                 data.records[i].win = "won !!";
                                              }
                                              else {
                                                data.records[i].win = "lose";
                                              }

                                            // need to update the value if known
                                            $('.bets' ).append('<li>'+ data.records[i].win +' <-> '+data.records[i].nom + ' ' + data.records[i].prenom + '</li>');
                                            fs.writeFileSync('./data.json', JSON.stringify(data));
                                         }
                                         else{
                                           $('bets').append('<li>'+ data.records[i].win +' <-> '+data.records[i].nom + ' ' + data.records[i].prenom + '</li>');
                                         }
                                      }
                                  }
                                   res.send($.html());
                                 }
                             });



                    }
                    else {
                      console.lof("error request#33");
                    }
              }); // end html request


      }
      else{ // id null

          res.contentType('text/html');
          res.write("<ul>");
            var data = JSON.parse(fs.readFileSync('./data.json', 'utf8'));
             for(var i = 0 ; i < data.records.length; i++) {
                res.write("<li><a href=\"results?id="+data.records[i].blockHeight+"\">" + data.records[i].blockHeight + "</a>"
                        + " | " + data.records[i].win
                        + " | " + data.records[i].nom
                        + " "+ data.records[i].prenom +"</li>");
             }
          res.write("</ul>");
          res.end();
      }

});

var server = app.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});
