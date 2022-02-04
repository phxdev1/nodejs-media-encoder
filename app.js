process.stdout = require('browser-stdout')()
const express = require('express'); //Import the express dependency
const app = express();              //Instantiate an express app, the main work horse of this server
const port = 5000;                  //Save the port number where your server will be listening
const multer = require('multer');
var path = require('path');
var fs = require('fs');
const chokidar = require('chokidar');
const serveIndex = require("serve-index");
const ffmpeg = require('fluent-ffmpeg');
app.use(express.static('uploads'));
app.use('/files', serveIndex("uploads"));


const SCREEN_WIDTH_4k = 3840;
const SCREEN_WIDTH_720 = 1280;
const SCREEN_WIDTH_1080 = 1920;

var watcher = chokidar.watch('uploads/', { ignored: /^\./, persistent: true });

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        // fs.mkdir('uploads/' + uniqueSuffix + "/", { recursive: true }, (err) => {
        //     if (err) throw err;
        // });
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname.split(".")[0] + "_original" + path.extname(file.originalname))
    }
});
const upload = multer({ storage: storage });
app.listen(port, () => {            //server starts listening for any attempts from a client to connect at port: {port}
    console.log(`Now listening on port ${port}`);
});


//Idiomatic expression in express to route and respond to a client request
app.get('/', (req, res) => {        //get requests to the root ("/") will route here
    res.sendFile('index.html', { root: __dirname });      //server responds by sending the index.html file to the client's browser
    //res.send('Hello World');                                                    //the .sendFile method needs the absolute path to the file, see: https://expressjs.com/en/4x/api.html#res.sendFile
});


app.post('/process', upload.single('video'), function (req, res, next) {
    res.send('Done!');
});

watcher.on('add', file_path => {
    var youtube_promo_4k = 'youtube_promo_4k';
    var youtube_promo_720 = 'youtube_promo_720';

    var uploaded_file = path.resolve(file_path);
    var file_name = path.basename(file_path).split('.')[0].replace("_original", "");
    console.log(`File ${uploaded_file} has been added`);

    //getYouTubePromo(uploaded_file, file_name, "4K").run();
    getYouTubePromo(uploaded_file, file_name, SCREEN_WIDTH_720, "Twitter-720").run();
    getYouTubePromo(uploaded_file, file_name, SCREEN_WIDTH_1080, "LinkedIn-1080").run();

    getYouTube(uploaded_file, file_name).run();
});


function getYouTubePromo(uploaded_file, file_name, _screen_width, title){
    
    var filterChain = []
    filterChain.push({
        filter: 'chromakey', options: '0x00ff00:0.25:0.0',
        inputs: '1', outputs: 'ckout'
    });
    filterChain.push({
        filter: 'scale', options: '3840:-1',
        inputs: 'ckout', outputs: 'overlay_scaled'
    });
    filterChain.push({
        filter: 'scale', options: '3840:-1',
        inputs: '0', outputs: 'main_scaled'
    });
    filterChain.push({
        filter: 'overlay', options: "(main_w-overlay_w)/2:(main_h-overlay_h)/2:format=auto",
        inputs: ['main_scaled', 'overlay_scaled'], outputs: 'overlay_out'
    });
    filterChain.push({
        filter: 'concat', options: "n=2:v=1:a=1",
        inputs: ['overlay_out', '0:a','2', '2:a'], outputs: ['youtube_promo_vid', 'youtube_promo_audio']
    });
    if(_screen_width && _screen_width != SCREEN_WIDTH_4k){
        filterChain.push({
            filter: 'scale', options: _screen_width + ':-1',
            inputs: 'youtube_promo_vid', outputs: ['youtube_promo_vid_scaled']
        });
    }

    var screen_width = _screen_width || SCREEN_WIDTH_4k; //This is after the previous line on purpose, I don't want to scale needlessly so I skip it if I'm not setting 4K


    var directory = path.resolve("processed/") + "\\" + file_name + "\\";
    fs.mkdir('processed/' + file_name + "/", { recursive: true }, (err) => {
        if (err) throw err;
    });
    console.log(`Directory ${directory} set`);



    var _title = "";
    if(title){
        _title = title; 
    }else
    {
        _title = _screen_width || SCREEN_WIDTH_4k;
    }

    return ffmpeg()
        .input(uploaded_file)
        .input(path.resolve("assets/intro_overlay.mp4"))
        .input(path.resolve("assets/end_youtube.mp4"))
        .addOptions(['-vsync '])
        .complexFilter(filterChain)
        .toFormat('mp4')
        .addOutputOption("-preset ultrafast")
        .output(directory + file_name + "_youtube_promo_"+ _title + ".mp4")
        .map(screen_width && screen_width != SCREEN_WIDTH_4k ? "youtube_promo_vid_scaled" : "youtube_promo_vid")
        .map("youtube_promo_audio")

        .on('start', (cmdline) => console.log(cmdline))
        .on('error', function (err, stdout, stderr) {
            console.log('Error: ' + err.message);
            console.log('ffmpeg output:\n' + stdout);
            console.log('ffmpeg stderr:\n' + stderr);

        })
        .on('progress', function (data) {
            process.stdout.clearLine();
            process.stdout.cursorTo(0);
            process.stdout.write(JSON.stringify(data));
            //process.stdout.write("Complete: " + Math.round(data.percent) + '%');
        })
        .on('end', function(stdout, stderr) {
            console.log('Transcoding succeeded !');
            console.log(stdout);
          })
}

function getYouTube(uploaded_file, file_name){
    
    var filterChain = []
    
    filterChain.push({
        filter: 'chromakey', options: '0x00ff00:0.25:0.0',
        inputs: '1', outputs: 'ckout'
    });
    filterChain.push({
        filter: 'scale', options: '3840:-1',
        inputs: 'ckout', outputs: 'overlay_scaled'
    });
    filterChain.push({
        filter: 'scale', options: '3840:-1',
        inputs: '0', outputs: 'main_scaled'
    });
    filterChain.push({
        filter: 'overlay', options: "(main_w-overlay_w)/2:(main_h-overlay_h)/2:format=auto",
        inputs: ['main_scaled', 'overlay_scaled'], outputs: 'overlay_out'
    });
    filterChain.push({
        filter: 'concat', options: "n=2:v=1:a=1",
        inputs: ['overlay_out', '0:a','2', '2:a'], outputs: ['youtube_promo_vid', 'youtube_promo_audio']
    });


    var directory = path.resolve("processed/") + "\\" + file_name + "\\";
    fs.mkdir('processed/' + file_name + "/", { recursive: true }, (err) => {
        if (err) throw err;
    });
    console.log(`Directory ${directory} set`);

    return ffmpeg()
        .input(uploaded_file)
        .input(path.resolve("assets/intro_overlay.mp4"))
        .input(path.resolve("assets/end_youtube_more.mp4"))
        .addOptions(['-vsync '])
        .complexFilter(filterChain)
        .toFormat('mp4')
        .addOutputOption("-preset ultrafast")
        .output(directory + file_name + "_YouTube-3840.mp4")
        .map("youtube_promo_vid")
        .map("youtube_promo_audio")

        .on('start', (cmdline) => console.log(cmdline))
        .on('error', function (err, stdout, stderr) {
            console.log('Error: ' + err.message);
            console.log('ffmpeg output:\n' + stdout);
            console.log('ffmpeg stderr:\n' + stderr);

        })
        .on('progress', function (data) {
            process.stdout.clearLine();
            process.stdout.cursorTo(0);
            process.stdout.write(JSON.stringify(data));
            //process.stdout.write("Complete: " + Math.round(data.percent) + '%');
        })
        .on('end', function(stdout, stderr) {
            console.log('Transcoding succeeded !');
            console.log(stdout);
          })
}