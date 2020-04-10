const path = require('path');
const { exec } = require('child_process');

function extractBackgroundMusic(videoPath, targetDirPath) {
    return new Promise((resolve, reject) => {
        // Extract audio from the video

        const audiofileName = 'originalAudio';
        const audioPath = path.join(targetDirPath, `${audiofileName}.mp3`);
        const command = `ffmpeg -i ${videoPath} -map 0:a:0 ${audioPath}`;
        exec(command, (err) => {
            if (err) {
                console.log('error extracting audio', err);
                return reject(err);
            }
            // Extract the background music from the video's audio
            const spleeterCommand = `spleeter separate -i ${audioPath} -p spleeter:2stems -o ${targetDirPath}/output`;
            exec(spleeterCommand, (err, stdout, stderr) => {
                if (err) {
                    console.log('error splitting with spleeter', err, stderr, stdout);
                    return reject(err);
                }
                return resolve(path.join(targetDirPath, 'output', audiofileName, 'accompaniment.wav'));
            })
        })
    })
}

function compressAudioFile(filePath, targetPath) {
    return new Promise((resolve, reject) => {
        const command = `ffmpeg -i ${filePath} -af "volume=1.5" ${targetPath}`;
        exec(command, (err) => {
            if (err) {
                console.log('error compressing file', err);
                return reject(err);
            }
            return resolve(targetPath);
        })
    })
}

module.exports = {
    extractBackgroundMusic,
    compressAudioFile,
}
