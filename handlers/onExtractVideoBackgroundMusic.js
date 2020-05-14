const fs = require('fs');
const uuid = require('uuid').v4;
const path = require('path');
const queues = require('../constants').queues;
const utils = require('../utils');
const converter = require('../converter');

const {
    storageService,
} = require('../services');

const onExtractVideoBackgroundMusic = channel => (msg) => {
    const { id, url } = JSON.parse(msg.content.toString());
    let videoPath;
    // download original video
    // cut it using the timing provided by the user
    // cut silent parts and add them as slides
    // uploaded cutted parts
    // cleanup
    const tmpDir = path.join(__dirname, '../tmp', `background-music-dir-${uuid()}`);
    fs.mkdirSync(tmpDir)
    console.log('got request to extract', id, url);

    videoPath = path.join(tmpDir, `${uuid()}.${utils.getFileExtension(url)}`);
    return utils.downloadFile(url, videoPath)
        // extract background music
        .then((videoPath) => {
            console.log('started extracting')
            const backgroundMusicPath = tmpDir;
            return converter.extractBackgroundMusic(videoPath, backgroundMusicPath)
        })
        // Compress file
        .then((backgroundMusicPath) => {
            const compressedBackgroundMusicPath = path.join(tmpDir, `compressed-bg.mp3`)
            return converter.compressAudioFile(backgroundMusicPath, compressedBackgroundMusicPath)
        })
        .then((backgroundMusicPath) => {
            console.log('uploading file')
            return storageService.saveFile('backgroundMusic', `${uuid()}-${backgroundMusicPath.split('/').pop()}`, fs.createReadStream(backgroundMusicPath))
        })
        .then((uploadRes) => {
            console.log('upload res', uploadRes);
            console.log('done');
            utils.cleanupDir(tmpDir);
            channel.sendToQueue(queues.EXTRACT_VIDEO_BACKGROUND_MUSIC_FINISH_QUEUE, new Buffer(JSON.stringify({ status: 'success', id, url: uploadRes.url, backgroundMusicKey: uploadRes.Key, Key: uploadRes.Key })), { persistent: true });
            channel.ack(msg);
        })
        .catch(err => {
            console.log(err);
            utils.cleanupDir(tmpDir);
            channel.ack(msg);
            channel.sendToQueue(queues.EXTRACT_VIDEO_BACKGROUND_MUSIC_FINISH_QUEUE, new Buffer(JSON.stringify({ id, status: 'failed' })), { persistent: true });
        })
}


module.exports = onExtractVideoBackgroundMusic;