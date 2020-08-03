const fs = require('fs');
const uuid = require('uuid').v4;
const path = require('path');
const queues = require('../constants').queues;
const utils = require('../utils');
const converter = require('../converter');

const {
    storageService,
} = require('../services');

const onExtractVideoVoice = channel => (msg) => {
  console.log('======================onExtractVideoVoice=================');
    const { id, url } = JSON.parse(msg.content.toString());
    let videoPath;
    // download original video
    // cut it using the timing provided by the user
    // cut silent parts and add them as slides
    // uploaded cutted parts
    // cleanup
    const tmpDir = path.join(__dirname, '../tmp', `voice-dir-${uuid()}`);
    fs.mkdirSync(tmpDir)
    console.log('got request to extract voice', id, url);

    videoPath = path.join(tmpDir, `${uuid()}.${utils.getFileExtension(url)}`);
    return utils.downloadFile(url, videoPath)
        // extract background music
        .then((videoPath) => {
            console.log('started extracting voice')
            const voicePath = tmpDir;
            return converter.extractVoice(videoPath, voicePath)
        })
        // Compress file
        .then((voicePath) => {
            const compressedVoicePath = path.join(tmpDir, `compressed-bg.mp3`)
            return converter.compressAudioFile(voicePath, compressedVoicePath)
        })
        .then((voicePath) => {
            console.log('uploading file')
            return storageService.saveFile('extractedVoice', `${uuid()}-${voicePath.split('/').pop()}`, fs.createReadStream(voicePath))
        })
        .then((uploadRes) => {
            console.log('upload res', uploadRes);
            console.log('done');
            utils.cleanupDir(tmpDir);
            channel.ack(msg);
            channel.sendToQueue(queues.EXTRACT_VIDEO_VOICE_FINISH_QUEUE, new Buffer(JSON.stringify({ id, url: uploadRes.url })), { persistent: true });
        })
        .catch(err => {
            console.log(err);
            utils.cleanupDir(tmpDir);
            channel.ack(msg);
            channel.sendToQueue(queues.EXTRACT_VIDEO_VOICE_FINISH_QUEUE, new Buffer(JSON.stringify({ id, status: 'failed' })), { persistent: true });
        })
}


module.exports = onExtractVideoVoice;