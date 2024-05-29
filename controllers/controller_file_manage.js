const path = require('path');
const fs = require("fs");
const mm = require('music-metadata');
const fileModel = require('../models/files_store');
const paPlanModel = require('../models/pa_plan');
const paScheduleModel = require('../models/pa_schedule');
const userModel = require("../models/users");
const { spawn } = require('child_process');

const api_upload_file = async (req, res) => {
    console.log("Controller: file man: File upload data name = " + req.file.originalname);
    //console.log(req.file)
    //var img = fs.readFileSync(req.file.path);
    //var encode_img = img.toString('base64');
      
    const metadata = await mm.parseFile(req.file.path);
    //console.log(util.inspect(metadata, { showHidden: false, depth: null }));
    const final_img = {
        name: req.file.filename,
        size: req.file.size,
        desc: req.file.fieldname,
        owner: req.user.name,
        owner_id: req.user._id,
        meta_data: metadata,
        status: 'unused',
        originalname: req.file.originalname,
        img: {
            //data: Buffer.from(encode_img),
            data: "FORLATERUSE",
            contentType: req.file.mimetype
            
        }
    }
    //console.log(final_img);
    fileModel.create(final_img, function(err, result) {
        if(err){
            console.log(err);
        } else {
            //console.log(result);
            console.log("-- Voice file was Saved To database");
            res.redirect('/file_manage');
        }
    })
    fileConvertWav(req.file.filename);
}
const fileConvertWav = (filename) => {
    console.log('Controller: file man: convert to wav to = ' + filename);
    if (!fs.existsSync('./uploads/wav')){
        fs.mkdirSync('./uploads/wav');
    }
    let cmdArgs = [
        '-I DUMMY',
        '-vvv',
        './uploads/' + filename,
        '--sout=#transcode{acodec=alaw,ab=64,scale=1,channels=1,samplerate=8000}' +
        ':standard{access=file,mux=wav,dst="./uploads/wav/'+ filename + '_wav"'
        ];
    console.log(cmdArgs);
    var vlc_cmd = '';
    if(process.env.NODE_ENV == 'development') {
      vlc_cmd = 'C:\\Program Files\\VideoLAN\\VLC\\vlc.exe';
    } else {
      vlc_cmd = '/usr/bin/cvlc';
    }
    let cmdConvert = spawn(vlc_cmd, cmdArgs);
    cmdConvert.stdout.on('data', (data) => {
        //console.log(`stdout: ${data}`);
      });
      
      cmdConvert.stderr.on('data', (data) => {
        //console.error(`stderr: ${data}`);
      });
      
      cmdConvert.on('close', (code) => {
        console.log("-- File converted " + `child process exited with code ${code}`);
      });
}
const fileManageView = (req, res) => {
    console.log("- View file for user = " + req.user.name);
    fileModel.find({ owner : req.user.name }, { img : {data: 0}  }, function(err, data){
        var html = '';
        if(err){
            console.log(err);
            html += '<tr><td> ระบบขัดข้อง</td></tr>';
            //return
        }
        var html = '';
        if(data.length == 0) {
            console.log("-- Controller:  No record found")
            html += '<tr><td> ยังไม่มีไฟล์</td></tr>';
            //return
        } else {
            data.forEach(function (value, id) { 
                if(value.name != undefined) {
                    //console.log('----- Filename = ' + value.name + " Size = " + value.size);
                    html += '<tr><td>' +  value.originalname + ' (' + value.name + ')</td><td>' + value.size 
                    + '</td><td><div class="row">' +
                    '<div class="col-md-6"><audio id="'+ value.name + '" controls><source src="/uploads/'+ value.name 
                    +'" type="audio/wav"></audio></div>'
                    +'<div class="col-md-6"><button class="form-control btn-sm btn-danger btn-delete-file float-right" id="' 
                    + value.id + '" fname="'+ value.name + '" style="width: 50px;"><i class="fa fa-trash"></i></button></div>'
                    + '</div></td></tr>';
                }     
            });
        }
        //console.log(html);
        res.render("file_manage", {
            user: req.user,
            table_content: html
        });
    });  
}
const api_file_list = (req,res) => {
    console.log("- File list requested from = " + req.user.name );
    //console.log(req.user);
    let _user_right = {};
    if((req.user.type == 'admin') || (req.user.type == 'sub_admin')) {
        _user_right.owner = req.user.name;
    } else {
        _user_right.owner = req.user.name;
    }
    fileModel.find(_user_right , { img : {data: 0}  }, function(err, data){
        if(err){
            console.log(err);
            return
        }
        if(data.length == 0) {
            console.log("-- No record found")
            return
        }
        res.json(data);
    });  
}
const api_delete_file = (req,res) => {
    console.log("- File delete requested = " + req.body.name);
    resData = {
        code : 0,
        message: 'default'
    }
    // check for use of this file
    paScheduleModel.find({file_id : req.body.id })
    .exec( function(err,doc) {
        //console.log(doc);
        if(doc.length > 0) {
            //can not delete still using
            resData.code = 1;
            resData.message = 'ไฟล์ยังมีการใช้งานอยู่';
            res.json(resData);
        } else {
            paPlanModel.find({file_id : req.body.id })
            .exec( function(err,_doc) {
                //console.log(_doc);
                if(doc.length > 0) {
                    //can not delete still using
                    resData.code = 1;
                    resData.message = 'ไฟล์ยังมีการใช้งานอยู่';
                    res.json(resData);
                } else {
                    fileModel.deleteOne({_id : req.body.id }, function (err, data){
                        if(err){
                            console.log(err);
                            resData.code = 1;
                            resData.message = '-- ไม่พบไฟล์';
                            return 0
                        }
                        fs.unlink('./uploads/' + req.body.name, function(err) {
                            if (err) {
                            resData.code = 0;
                            resData.message = '-- file not delete';
                            //throw err
                            } else {
                            console.log("-- Successfully deleted the file.")
                            }
                            return 0
                        })
                        fs.unlink('./uploads/wav/' + req.body.name, function(err) {
                            if (err) {
                            resData.code = 0;
                            resData.message = '-- file not delete';
                            //throw err
                            } else {
                            console.log("-- Successfully deleted the wav file.")
                            }
                            return 0
                        })
                    })
                }
            })
            res.json(resData);
        } 
    })
}
const api_update_file = (req,res) => {
    console.log("- File update requested.");
    resData = {
        code : 0,
        message: 'default'
    }
    const directoryPath = path.join(__dirname, '../uploads');
    //console.log(directoryPath);
    fs.readdir(directoryPath, function (err, files) {
        //handling error
        if (err) {
            return console.log('Unable to scan directory: ' + err);
        } 
        //listing all files using forEach
        files.forEach(function (file) {
            // Do whatever you want to do with the file
            //console.log(file); 
            if(file.startsWith('voicefile')) fileConvertWav(file);
            else console.log('Not a voice file');
        });
    });
    fileModel.find({}).exec((err,docs) => {
        docs.forEach((doc) => {
            //console.log(doc)
            userModel.find({ name : doc.owner }).exec(async (err,user) => {
                console.log(user[0]._id + '=' + doc._id);
                await fileModel.updateOne({ _id: doc._id}, { owner_id : user[0]._id });
            })
        })
    })
    res.json(resData);
}
module.exports = {
    api_upload_file,
    fileManageView,
    api_file_list,
    api_delete_file,
    api_update_file
  };

