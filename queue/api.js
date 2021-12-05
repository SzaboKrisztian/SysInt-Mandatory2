const fastify = require('fastify')({ logger: true });
const {
    getTopics,
    registerProducer,
    registerSubscriber,
    replayMessages,
    postMessage
} = require('./controller');

fastify.get('/', (req, res) => {
    return {
        endpoints: [
            {
                endpoint: '/api/topics',
                method: 'GET'
            },
            {
                endpoint: '/api/messages',
                method: 'GET',
                params: { topic: 'string', timestamp: 'string?' }
            },
            {
                endpoint: '/api/producers',
                method: 'POST',
                params: { host: 'string', topic: 'string', format: 'string' }
            },
            {
                endpoint: '/api/subscribers',
                method: 'POST',
                params: {
                    topics: [{ topic: 'string', format: 'string' }],
                    host: 'string'
                }
            },
            {
                endpoint: '/api/messages',
                method: 'POST',
                params: {
                    body: 'string'
                }
            },
        ],
        formats: ['json', 'xml', 'csv', 'tsv']
    };
});

fastify.get('/api/topics', (req, res) => {
    return getTopics(req.body);
});

fastify.get('/api/messages', (req, res) => {
    return replayMessages(req.body);
});

fastify.post('/api/producers', (req, res) => {
    return registerProducer(req.body);
});

fastify.post('/api/subscribers', (req, res) => {
    return registerSubscriber(req.body);
});

fastify.post('/api/messages', (req, res) => {
    return postMessage(req.body);
});

function init(port = 3000) {
    try {
        return fastify.listen(port)
            .then(() => console.log(`Server listening on ${port}`));
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
}

module.exports = { init };