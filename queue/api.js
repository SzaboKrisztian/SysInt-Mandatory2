const fastify = require('fastify')({ logger: true });
const {
    getTopics,
    register,
    subscribe,
    replay,
    post
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

fastify.get('/api/topic', (req, res) => {
    return getTopics();
});

fastify.get('/api/message', (req, res) => {
    let contentType;
    switch (req.query.format) {
        case 'json':
            contentType = 'application/json; charset=utf-8';
            break;
        case 'csv':
            contentType = 'text/csv; charset=utf-8';
            break;
        case 'tsv':
            contentType = 'text/tab-separated-values; charset=utf-8';
            break;
        case 'xml':
            contentType = 'application/xml; charset=utf-8';
            break;
    } 
    try {
        return res.header('content-type', contentType).send(replay(req.query));
    } catch (err) {
        res.status(400).send(err.message);
    }
});

fastify.post('/api/producer', (req, res) => {
    try {
        return register(req.body);
    } catch (err) {
        res.status(400).send(err.message);
    }
});

fastify.post('/api/subscriber', (req, res) => {
    try {
        return subscribe(req.body);
    } catch (err) {
        res.status(400).send(err.message);
    }
});

fastify.post('/api/message', (req, res) => {
    try {
        return post(req.body);
    } catch (err) {
        res.status(400).send(err.message);
    }
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