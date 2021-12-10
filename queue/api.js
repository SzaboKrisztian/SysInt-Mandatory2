const fastify = require('fastify')({ logger: false });
const {
    getTopics,
    register,
    subscribe,
    unsubscribe,
    replay,
    post
} = require('./controller');
const { xml2json, tsv2json, csv2json } = require('./formats');

fastify.get('/', (req, res) => {
    return {
        endpoints: [
            {
                endpoint: '/api/topic',
                method: 'GET'
            },
            {
                endpoint: '/api/message',
                method: 'GET',
                queryParams: { topic: 'string', format: 'string', timestamp: 'string?' }
            },
            {
                endpoint: '/api/publisher',
                method: 'POST',
                body: { id: 'string?', topics: [{ name: 'string', format: 'string' }] }
            },
            {
                endpoint: '/api/subscriber',
                method: 'POST',
                body: {
                    host: 'string',
                    topics: [{ name: 'string', format: 'string' }],
                }
            },
            {
                endpoint: '/api/message',
                method: 'POST',
                body: {
                    id: 'string',
                    topic: 'string',
                    message: 'string'
                }
            },
            {
                endpoint: '/api/subscriber',
                method: 'DELETE',
                queryParams: {
                    id: 'string',
                    topics: ['string'],
                }
            },
        ],
        formats: ['json', 'xml', 'csv', 'tsv'],
    };
});

fastify.get('/api/topic', (req, res) => {
    return getTopics();
});

fastify.get('/api/message', async (req, res) => {
    try {
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
            default:
                throw new Error("Invalid format");
        }
        return res.header('content-type', contentType).send(await replay(req.query));
    } catch (err) {
        res.status(400).send(err.message);
    }
});

fastify.post('/api/publisher', (req, res) => {
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
        post(req.body);
        res.send();
    } catch (err) {
        res.status(400).send(err.message);
    }
});

fastify.delete('/api/subscriber', (req, res) => {
    res.send();
});


// fastify.addContentTypeParser(
//     'text/csv',
//     { parseAs: 'string' },
//     function (request, payload, done) {
//         try {
//             const data = JSON.parse(payload);
//             data.message = csv2json(payload.message);
//             done(null, data);
//         } catch (error) {
//             done(error);
//         }
//     }
// );

// fastify.addContentTypeParser(
//     'text/tab-separated-values',
//     { parseAs: 'string' },
//     function (request, payload, done) {
//         try {
//             const data = JSON.parse(payload);
//             data.message = tsv2json(payload.message);
//             done(null, data);
//         } catch (error) {
//             done(error);
//         }
//     }
// );
        
// fastify.addContentTypeParser(
//     'application/xml',
//     { parseAs: 'string' },
//     function (request, payload, done) {
//         try {
//             const data = JSON.parse(payload);
//             data.message = xml2json(payload.message);
//             done(null, data);
//         } catch (error) {
//             done(error);
//         }
//     }
// );

module.exports.init = function(port = 3000) {
    try {
        return fastify.listen(port)
            .then(() => console.log(`Server listening on ${port}`));
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
}