const fs = require('fs');
const https = require('https');
const path = require('path');

const url = 'https://github.com/mdn/learning-area/raw/main/html/multimedia-and-embedding/video-and-audio-content/viper.mp3';
const dest = path.join(__dirname, '../public/hello.mp3');

console.log('Downloading audio from ' + url + ' to ' + dest);

function download(fileUrl, fileDest) {
  const file = fs.createWriteStream(fileDest);
  https.get(fileUrl, function(response) {
    if (response.statusCode === 301 || response.statusCode === 302) {
      console.log('Following redirect to: ' + response.headers.location);
      download(response.headers.location, fileDest);
      return;
    }
    
    if (response.statusCode !== 200) {
      console.error('Failed to download file: ' + response.statusCode);
      fs.unlink(fileDest, () => {});
      process.exit(1);
    }
    
    response.pipe(file);
    file.on('finish', function() {
      file.close(() => {
        console.log('Download complete and file closed.');
        process.exit(0);
      });
    });
  }).on('error', function(err) {
    fs.unlink(fileDest, () => {});
    console.error('Download error: ' + err.message);
    process.exit(1);
  });
}

// Ensure public directory exists
const publicDir = path.dirname(dest);
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

download(url, dest);
