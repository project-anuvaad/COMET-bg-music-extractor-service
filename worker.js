
const fs = require('fs');
const generators = require('@comet-anuvaad/generators');

const RABBITMQ_SERVER = process.env.RABBITMQ_SERVER;

const rabbitmqService = require('./vendors/rabbitmq');
const { queues } = require('./constants');
const {
    EXTRACT_VIDEO_BACKGROUND_MUSIC_QUEUE,
    EXTRACT_VIDEO_BACKGROUND_MUSIC_FINISH_QUEUE,
    EXTRACT_VIDEO_VOICE_QUEUE,
    EXTRACT_VIDEO_VOICE_FINISH_QUEUE
    } = queues;

const onExtractVideoBackgroundMusic = require('./handlers/onExtractVideoBackgroundMusic');
const onExtractVideoVoice = require('./handlers/onExtractVideoVoice');

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
    console.log('RABBITMQ CONNECTED')
    channel = ch;
    channel.prefetch(1)
    channel.assertQueue(EXTRACT_VIDEO_BACKGROUND_MUSIC_QUEUE, { durable: true });
    channel.assertQueue(EXTRACT_VIDEO_BACKGROUND_MUSIC_FINISH_QUEUE, { durable: true });

    channel.assertQueue(EXTRACT_VIDEO_VOICE_QUEUE, { durable: true });
    channel.assertQueue(EXTRACT_VIDEO_VOICE_FINISH_QUEUE, { durable: true });

    channel.consume(EXTRACT_VIDEO_BACKGROUND_MUSIC_QUEUE, onExtractVideoBackgroundMusic(channel), { noAck: false });
    channel.consume(EXTRACT_VIDEO_VOICE_QUEUE, onExtractVideoVoice(channel), { noAck: false });

    // Exit app on channel error
    channel.on('error', (err) => {
        console.log('RABBITMQ ERROR', err)
        process.exit(1);
    })
    channel.on('close', () => {
        console.log('RABBITMQ CLOSE')
        process.exit(1);
    }) 
    setTimeout(() => {
        // channel.sendToQueue(CONVERT_VIDEO_TO_ARTICLE_QUEUE, new Buffer(JSON.stringify({ videoId: "5d6d58e54be12b2d18b22b58", articleId: '5d6d5a1e03f9fa6cb96cc2ee' })));
    }, 2000);

    const { app, server } = generators.serverGenerator({ uploadLimit: 50 });
    generators.healthcheckRouteGenerator({ router: app, rabbitmqConnection: channel.connection });
    server.listen(4000)

})
