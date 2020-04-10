
const fs = require('fs');

const RABBITMQ_SERVER = process.env.RABBITMQ_SERVER;

const rabbitmqService = require('./vendors/rabbitmq');
const { queues } = require('./constants');
const {
    EXTRACT_VIDEO_BACKGROUND_MUSIC_QUEUE,
    EXTRACT_VIDEO_BACKGROUND_MUSIC_FINISH_QUEUE
    } = queues;

const onExtractVideoBackgroundMusic = require('./handlers/onExtractVideoBackgroundMusic');

const REQUIRED_DIRS = ['./tmp'];

try {

    REQUIRED_DIRS.forEach((dir) => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir)
        } else {
            fs.unlinkSync(`${dir}/*`)
        }
    })
} catch(e) {
    console.log(e);
}

let channel;
rabbitmqService.createChannel(RABBITMQ_SERVER, (err, ch) => {
    if (err) throw err;
    console.log('connected to ', RABBITMQ_SERVER, EXTRACT_VIDEO_BACKGROUND_MUSIC_QUEUE, process.env.MODEL_DIRECTORY)
    channel = ch;
    channel.prefetch(1)
    channel.assertQueue(EXTRACT_VIDEO_BACKGROUND_MUSIC_QUEUE, { durable: true });
    channel.assertQueue(EXTRACT_VIDEO_BACKGROUND_MUSIC_FINISH_QUEUE, { durable: true });

    channel.consume(EXTRACT_VIDEO_BACKGROUND_MUSIC_QUEUE, onExtractVideoBackgroundMusic(channel), { noAck: false });
    
    setTimeout(() => {
        // channel.sendToQueue(CONVERT_VIDEO_TO_ARTICLE_QUEUE, new Buffer(JSON.stringify({ videoId: "5d6d58e54be12b2d18b22b58", articleId: '5d6d5a1e03f9fa6cb96cc2ee' })));
    }, 2000);
})
