const { exec } = require('child_process');
const fs = require('fs');
// silence threashold in seconds
// slide duration threashold in seconds
// const SLIDE_THREASHOLD = 10;
const async = require('async')

function downloadFile(url, targetPath) {
    return new Promise((resolve, reject) => {
        exec(`curl ${url} --output ${targetPath}`, (err) => {
            if (err) {
                return reject(err);
            }
            // ffmpeg emits warn messages on stderr, omit it and check if the file exists
            if (!fs.existsSync(targetPath)) {
                return reject(new Error('Failed to download file'));
            }
            return resolve(targetPath);
        })
    })
}

// function divideSpeakerSlidesByDot(slide) {
//     const itemsDuration = parseFloat(slide.items[slide.items.length - 1].end_time) - parseFloat(slide.items[0].start_time);
//     if (itemsDuration <= SLIDE_THREASHOLD) return [slide];
//     const newSlides = [];
//     slide.items.forEach((item) => {
//         item.start_time = parseFloat(item.start_time);
//         item.end_time = parseFloat(item.end_time);
//     })
//     let timeSum = slide.items[0].end_time - slide.items[0].start_time;
//     let firstItem = slide.items[0];
//     let lastItem;
//     let content = slide.items[0].alternatives[0].content;
//     slide.items.forEach((item, itemIndex) => {
//         if (item.type !== 'punctuation') {
//             timeSum += (item.end_time - item.start_time);
//         }
//         if (itemIndex === 0) return;
//         if (item.type === 'punctuation') {
//             content += `${item.alternatives[0].content}`
//         } else {
//             lastItem = item;
//             content += ` ${item.alternatives[0].content}`
//         }
//         if (item.alternatives[0].content === '.' && timeSum >= 10) {
//             newSlides.push({
//                 speakerLabel: slide.speakerLabel,
//                 startTime: firstItem.start_time,
//                 endTime: lastItem.end_time,
//                 content,
//             })
//             content = ''
//             firstItem = slide.items[itemIndex + 1];
//             timeSum = 0
//         } else if (itemIndex === (slide.items.length - 1)) {
//             newSlides.push({
//                 speakerLabel: slide.speakerLabel,
//                 startTime: firstItem.start_time,
//                 endTime: lastItem.end_time,
//                 content,
//             })
//         }

//     })

//     return newSlides;
// }

function getRemoteFileDuration(url) {
    return new Promise((resolve, reject) => {
        exec(`ffprobe -i ${url} -show_entries format=duration -v quiet -of csv="p=0"`, (err, stdout, stderr) => {
            if (err) {
                return reject(err);
            }
            if (stderr) {
                return reject(stderr);
            }
            const duration = parseFloat(stdout.replace('\\n', ''));
            resolve(duration);
        })
    })
}

function getFileExtension(url) {
    return url.split('.').pop().toLowerCase();
}

function cleanupFiles(files) {
    files.forEach((file) => {
        fs.unlink(file, () => { });
    })
}

function cleanupDir(dir){
    exec(`rm -rf ${dir}`, (err) => {
        console.log('deleted directory', dir, err);
    })
}

function getFilesDuration(urls, callback) {
    const getFilesDurationFuncArray = [];
    urls.forEach(url => {
        function getFileDuration(cb) {
            getRemoteFileDuration(url)
            .then((duration) => cb(null, duration))
            .catch(err => callback(err))
        }

        getFilesDurationFuncArray.push(getFileDuration);
    })

    async.parallelLimit(getFilesDurationFuncArray, 3, (err, results) => {
        if (err) {
            return callback(err);
        }
        if (!results || results.length === 0) return callback(null, 0);

        const duration = results.reduce((acc, d) => acc + parseFloat(d), 0);
        return callback(null, duration);
    })
}

module.exports = {
    getRemoteFileDuration,
    getFilesDuration,
    downloadFile,
    getFileExtension,
    cleanupFiles,
    cleanupDir,
}