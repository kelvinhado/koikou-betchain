var fs = require('fs'),
cheerio = require('cheerio'),
request = require('request');
var http = require('http'),
async = require('async');




function getDataFromFile() {
    return JSON.parse(fs.readFileSync('./data.json', 'utf8'));
}
function writeDataToFile(data){
    fs.writeFileSync('./data.json', JSON.stringify(data));
}

// get all the bets that the given player have made
var getRecords = exports.getRecordsForPlayer = function(nom, prenom, height, callback) {

  var data = getDataFromFile();
  var results = {
                  "hits" : 0,
                  "records" : []
                };

  for(var i = 0 ; i < data.records.length; i++) {
      //single search if height not null
      if(height !== null) {
          if(data.records[i].nom === nom && data.records[i].prenom && data.records[i].blockHeight == height){
             results.hits++;
             results.records.push(data.records[i]);
          }
      }
      //multiple search if given height is null
      else {
          if(data.records[i].nom === nom && data.records[i].prenom === prenom){
             results.hits++;
             results.records.push(data.records[i]);
          }
      }
  }

  callback(results);

};

// save a bet in the database file
exports.saveBet = function(record, callback){

    getRecords(record.nom, record.prenom, record.blockHeight, function(results){
        if(results.hits === 0){ // no record for this bitcoin height
          var data = getDataFromFile();
          data.records.push(record);
          writeDataToFile(data);
          console.log("bet saved.");
          callback(true);
        }
        else {
          console.log("bet NOT saved : the player already have a bet for this Block !");
          callback(false);
        }
    });

};

exports.checkBlockPlusDeuxIssetInDB = function(height, callback){
    var data = getDataFromFile();
    var heightP2 =  parseInt(height) + 2;
    var result;
    var foundInDb = false;
    for(var i = 0 ; i < data.records.length; i++) {
        if(data.records[i].blockHeight == heightP2){
          result = data.records[i].blockHash;
          foundInDb = true;

          var resultHex = result.slice(-2);
          resultBin = parseInt(resultHex,16).toString(2);
          callback(resultBin.slice(-5));

        }
    }

    if(!foundInDb){
        callback(null);
    }
};

exports.checkForWin = function(callback) {

var apiURL = "http://blockexplorer.com/api/block-index/";

var data = getDataFromFile();
var tableID = [];
var resultToUpdate = [];

  for(var i = 0 ; i < data.records.length; i++) {
      if(data.records[i].win == -1){
          var blockHeight = (parseInt(data.records[i].blockHeight) + 2);
          if(tableID[tableID.length-1] != blockHeight){
              tableID.push(blockHeight);
          }
      }
  }



// ASYNC >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
  async.each(tableID, function(blockID, callback) {

    strUrl = apiURL + blockID;
  //  console.log('Processing  url :' + strUrl);

    request(strUrl, function(error, response, html){ // ! async !
          if(!error){
            var hashPlusDeux = 0;
            var resultBin;
              if(html != "Bad Request") {
                  var jsonResult = JSON.parse(html);
                  var binaire = getBinaireFromHash(jsonResult.blockHash);
                  console.log("fetched url : " + blockID + " >> "+ binaire);
                  var record = { "blockHeight" : blockID, "result" : binaire};
                  resultToUpdate.push(record);
                }
                else{
                  console.log("fetched url : ERROR the result may not be out yet !" + blockID );
                }
              callback();
          }
    });

    // END EACH ASYNC
  }, function(err){
      // if any of the file processing produced an error, err would equal that error
      if( err ) {
        console.log('A file failed to process');
        callback();
      } else {
        console.log('All request have been processed successfully');

        // SAVING RESULTS >_>_>_>_>_>_>_>_>_>_>_>_>_>
          for(var i = 0 ; i < data.records.length; i++) { // for each records (data)
              if(data.records[i].win === -1){
                  for(var j = 0 ; j < resultToUpdate.length; j++) { // for each (fetched hash)
                      if(resultToUpdate[j].blockHeight == (parseInt(data.records[i].blockHeight) + 2).toString()){  //if same
                          data.records[i].win  = compareResultBinaire(data.records[i].pari, resultToUpdate[j].result);
                          data.records[i].result = resultToUpdate[j].result;
                          var da = data.records[i];
                          console.log("updating record : ("+ da.blockHeight +"+2)"+ da.nom + " " + da.prenom + " win = " +  da.win + " >>>>" + da.pari + " vs " + resultToUpdate[j].result );
                      }
                  }
              }
          }

          writeDataToFile(data);
        // SAVINF RESULTS <_<_<_<_<_<_<_<_<_<_<_<_<_<





        callback();
      }
  });

// ASYN <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

};

var getBinaireFromHash = function(hash){
  var hexa = hash.slice(-2);
  return parseInt(hexa,16).toString(2).slice(-5);
};

var compareResultBinaire = function(bin1, bin2){  // return le nombre de match
    var sum =  0;
    for(var i = 0; i < 5; i++){
       if(bin1[i] == bin2[i]){
          sum++;
       }
    }
    return sum;
};
