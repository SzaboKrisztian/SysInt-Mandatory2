const fastify = require('fastify')({ logger: true });
const axios = require('axios').default;

const PORT = 7878;
const HOST = '127.0.0.1';
const QUEUE_PORT = 3000;
const QUEUE_HOST = '127.0.0.1';
const queue = `${QUEUE_HOST}:${QUEUE_PORT}`;

const MIN_SUBS = 3;
const MAX_SUBS = 5;
const MIN_TOPICS_PER_SUB = 2;
const MAX_TOPICS_PER_SUB = 4;

const numSubs = Math.floor((Math.random() * (MAX_SUBS - MIN_SUBS) + MIN_SUBS))
const numTopicsPerSub = Math.floor((Math.random() * (MAX_TOPICS_PER_SUB - MIN_TOPICS_PER_SUB) + MIN_TOPICS_PER_SUB))

const formats = ['json', 'xml', 'csv', 'tsv'];
const topics = ['people', 'cars', 'phones', 'laptops', 'movies', 'bands'];

const subscribers = Array.from(new Array(numSubs).keys()).map(idx => {
    const chosenTopics = randomChoices(topics, numTopicsPerSub)
        .map(topic => ({
            name: topic,
            format: randomChoice(formats)
        }));

    return {
        name: `sub${idx + 1}`,
        id: null,
        host: `${HOST}:${PORT}/sub${idx + 1}`,
        topics: chosenTopics
    }
});

fastify.post('/:subscriber', (req, res) => {
    console.log(`${new Date().toLocaleString('en-GB', { hour12: false })}: ${req.params.subscriber} - ${req.body.topic}\n${req.body.message}`);
    res.status(200).send();
});

try {
    const promises = [];
    subscribers.forEach(sub => {
        promises.push(axios.post(`http://${queue}/api/subscriber`, {
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
                    console.log(`Error while trying to subscribe ${subscribers[i].name}`);
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
