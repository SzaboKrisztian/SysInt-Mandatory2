const axios = require('axios').default;

const QUEUE_HOST = '127.0.0.1';
const QUEUE_PORT = 3000;
const queueAddress = `${QUEUE_HOST}:${QUEUE_PORT}`;

const formats = ['json', 'xml', 'csv', 'tsv'];
const topics = ['people', 'cars', 'phones', 'laptops', 'movies', 'bands'];

const promises = formats.map(format => axios.post(`http://${queueAddress}/api/producer`, {
    topics: topics.map(topic => ({ topic, format }))
}));

Promise.allSettled(promises).then(res => {
    const ids = res
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value.data.id);
    console.log({ ids });
});