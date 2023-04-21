'use strict';

//  Google Cloud Speech Playground with node.js and socket.io
//  Created by Vinzenz Aubry for sansho 24.01.17
//  Feel free to improve!
//	Contact: v@vinzenzaubry.com

const express = require('express'); // const bodyParser = require('body-parser'); // const path = require('path');
const environmentVars = require('dotenv').config();
const {
  SpeechTranslationServiceClient,
} = require('@google-cloud/media-translation');
const fs = require("fs")
// Creates a client
const speechClient = new SpeechTranslationServiceClient();
// Google Cloud
// const speechClient = new speech.SpeechClient(); // Creates a client
const app = express();
const port = process.env.PORT || 1337;
const server = require('http').createServer(app);
const io = require('socket.io')(server);

app.use('/assets', express.static(__dirname + '/public'));
app.use('/session/assets', express.static(__dirname + '/public'));
app.set('view engine', 'ejs');

// =========================== ROUTERS ================================ //

app.get('/', function (req, res) {
  res.render('index', {});
});

app.use('/', function (req, res, next) {
  next(); // console.log(`Request Url: ${req.url}`);
});

// =========================== SOCKET.IO ================================ //

io.on('connection', function (client) {


  console.log('Client Connected to server');

  client.on('join', function () {
    client.emit('messages', 'Socket Connected to Server');
  });

  client.on('messages', function (data) {
    client.emit('broad', data);
  });

  client.on('startGoogleCloudStream', function (data) {
    //startRecognitionStream(this, data);
    translateFromMicrophone()

  });



  ;


  function translateFromMicrophone() {
    /**
     * TODO(developer): Uncomment the following lines before running the sample.
     */


    let isFirst = true;
    const encoding = 'linear16';
    const sampleRateHertz = 16000;
    const sourceLanguage = 'en-US';
    const targetLanguage = 'it-IT';
    console.log('Begin speaking ...');

    const config = {
      audioConfig: {
        audioEncoding: encoding,
        sampleRateHertz: sampleRateHertz,
        sourceLanguageCode: sourceLanguage,
        targetLanguageCode: targetLanguage,
      },
      singleUtterance: true,
    };

    // First request needs to have only a streaming config, no data.
    const initialRequest = {
      streamingConfig: config,
      audioContent: null,
    };


    let currentTranslation = '';
    let currentRecognition = '';
    // Create a recognize stream
    const stream = speechClient
      .streamingTranslateSpeech()
      .on('data', response => {
        const { result, speechEventType } = response;
        if (speechEventType === 'END_OF_SINGLE_UTTERANCE') {
          console.log(`\nFinal translation: ${currentTranslation}`);
          console.log(`Final recognition result: ${currentRecognition}`);

          stream.destroy();
          // recording.stop();
        } else {
          currentTranslation = result.textTranslationResult.translation;
          currentRecognition = result.recognitionResult;
          console.log(`\nPartial translation: ${currentTranslation}`);
          console.log(`Partial recognition result: ${currentRecognition}`);
        }
      });

    client.on('binaryData', function (data) {

      let baseData = data.toString('base64')
      if (stream !== null) {
        if (isFirst) {
          console.log("FirstCall")
          stream.write(initialRequest);
          isFirst = false;
        }
        const request = {
          streamingConfig: config,
          audioContent: baseData,
        };
        if (!stream.destroyed) {
          fs.appendFileSync('testtest.wav', data);
          stream.write(request)




        }
      }
    })

    client.on('endGoogleCloudStream', function () {

      console.log("end")
      stream.end();
    });

  }



});

// =========================== GOOGLE CLOUD SETTINGS ================================ //

// The encoding of the audio file, e.g. 'LINEAR16'
// The sample rate of the audio file in hertz, e.g. 16000
// The BCP-47 language code to use, e.g. 'en-US'
const encoding = 'LINEAR16';
const sampleRateHertz = 16000;
const languageCode = 'en-US'; //en-US

const request = {
  config: {
    encoding: encoding,
    sampleRateHertz: sampleRateHertz,
    languageCode: languageCode,
    profanityFilter: false,
    enableWordTimeOffsets: true,
    // speechContexts: [{
    //     phrases: ["hoful","shwazil"]
    //    }] // add your own speech context for better recognition
  },
  interimResults: true, // If you want interim results, set this to true
};

// =========================== START SERVER ================================ //

server.listen(port, '127.0.0.1', function () {
  //http listen, to make socket work
  // app.address = "127.0.0.1";
  console.log('Server started on port:' + port);
});
