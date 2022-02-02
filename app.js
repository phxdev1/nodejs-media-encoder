const express = require('express'); //Import the express dependency
const app = express();              //Instantiate an express app, the main work horse of this server
const port = 5000;                  //Save the port number where your server will be listening
const multer  = require('multer');
var path = require('path');
var fs = require('fs');
const chokidar = require('chokidar');

var watcher = chokidar.watch('uploads/', {ignored: /^\./, persistent: true});

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        fs.mkdir('uploads/' + uniqueSuffix + "/", { recursive: true }, (err) => {
            if (err) throw err;
        });
      cb(null, 'uploads/' + uniqueSuffix + "/");
    },
    filename: function (req, file, cb) {
      
      cb(null, file.fieldname + "_original" + path.extname(file.originalname))
    }
});
const upload = multer({ storage: storage });
app.listen(port, () => {            //server starts listening for any attempts from a client to connect at port: {port}
    console.log(`Now listening on port ${port}`); 
});


//Idiomatic expression in express to route and respond to a client request
app.get('/', (req, res) => {        //get requests to the root ("/") will route here
    res.sendFile('index.html', {root: __dirname});      //server responds by sending the index.html file to the client's browser
    //res.send('Hello World');                                                    //the .sendFile method needs the absolute path to the file, see: https://expressjs.com/en/4x/api.html#res.sendFile 
});

app.post('/process', upload.single('video'), function (req, res, next) {
    res.send('Done!'); 
});

watcher.on('add', path => {
    console.log(`File ${path} has been added`);
    //TODO: FFMPEG
});

