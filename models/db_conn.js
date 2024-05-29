var mongoose = require('mongoose');
const dbs = process.env.MONGODB_URI;

mongoose.connect(dbs +'/file-upload', {useNewUrlParser: true});
  var conn = mongoose.connection;
  conn.on('connected', function() {
    console.log('database is connected successfully');
  });
  conn.on('disconnected',function(){
    console.log('database is disconnected successfully');
  })
  conn.on('error', console.error.bind(console, 'connection error:'));
module.exports = conn;