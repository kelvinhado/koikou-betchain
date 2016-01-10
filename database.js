var fs = require('fs');


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
