const fastify = require('fastify')({ logger: false });
const axios = require('axios').default;
const fmts = require('formats');

const PORT = 7878;
const HOST = '127.0.0.1';
const QUEUE_PORT = 3000;
const QUEUE_HOST = '127.0.0.1';
const queueAddress = `${QUEUE_HOST}:${QUEUE_PORT}`;

const numSubs = 4;

const formats = fmts.supportedFormats;
const topics = ['people', 'cars', 'transactions', 'posts', 'requests', 'products'];

const subscribers = Array.from(new Array(numSubs).keys()).map(idx => {
    const chosenTopics = topics.map(topic => ({
            name: topic,
            format: formats[idx]
        }));

    return {
        name: `sub${idx + 1}`,
        id: null,
        host: `${HOST}:${PORT}/sub${idx + 1}`,
        topics: chosenTopics
    }
});

fastify.post('/:subscriber', (req, res) => {
    const msg = req.body.message.trim().replace(/\n/g, '\n    ');
    console.log(`\n${new Date().toLocaleString('en-GB', { hour12: false })}: ${req.params.subscriber} - ${req.body.topic}\n    ${msg}`);
    res.status(200).send();
});

try {
    const promises = [];
    subscribers.forEach(sub => {
        promises.push(axios.post(`http://${queueAddress}/api/subscriber`, {
            host: sub.host,
            topics: sub.topics
        }));
    });
    Promise.allSettled(promises)
        .then(res => {
            res.forEach((e, i) => {
                if (e.status === 'fulfilled') {
                    const result = e.value.data;
                    console.log(`${subscribers[i].name} subscribed to ${result.subscribed.length} topics. ${result.invalid.length} failed.`);
                    subscribers[i].id = result.id;
                } else {
                    console.log(`Error while trying to subscribe ${subscribers[i].name}: ${e.reason}`);
                }
            });
            fastify.listen(PORT)
                .then(() => console.log(`Subscriber server listening on ${PORT}`))
        });
} catch (err) {
    fastify.log.error(err);
    process.exit(1);
}

function randomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function randomChoices(array, num) {
    const result = [...array];

    while (num < result.length) {
        result.splice(Math.floor(Math.random() * result.length), 1);
    }

    return result;
}
