const fmts = require('./formats');
const { getMessages, saveMessage, savePubsSubs, loadPubsSubs, clearTopic, clearAllTopics, deletePubSubFile } = require('./persistence');
const { generateId, log } = require('./utils')
const axios = require('axios').default;

CHECK_QUEUE_INTERVAL_MS = 500;

/*
db = {
    publishers: {
        [id: string]: {
            [topicName: string]: string // The value is the format
        }
    },
    subscribers: {
        [id: string]: {
            [topicName: string]: {
                host: string,
                format: string,
            }
        }
    },
    topics: {
        [topicName: string]: { timestamp: string, content: Object }[]
    }
}
*/

const args = process.argv.slice(2);
const coldStart = args.includes('--cold');
const reset = args.includes('--reset');
if (reset) {
    deletePubSubFile();
    clearAllTopics();
}
const persistedData = coldStart || reset ? null : loadPubsSubs();
const db = persistedData
    ? {
        ...persistedData,
        topics: {},
    }
    : {
        publishers: {},
        subscribers: {},
        topics: {},
    }

setInterval(() => {
    let topics = 0;
    let successes = 0;
    let failures = 0;
    const promises = [];
    Object.keys(db.topics).forEach(topic => {
        topics += db.topics[topic].length > 0 ? 1 : 0;
        while (db.topics[topic].length > 0) {
            const entry = db.topics[topic].splice(0, 1)[0];
            promises.push(notifySubscribers(topic, entry.content)
                .then(res => {
                    if (res.total > 0) {
                        successes += res.successful;
                        failures += res.failed;
                    }
                }));
        }
    });
    Promise.allSettled(promises).then(res => {
        if (topics > 0) {
            log(`Successfully notified ${successes} subscribers in ${topics} topics. ${failures} failures.`);
        }
    });
}, CHECK_QUEUE_INTERVAL_MS);

module.exports.getTopics = function getTopics() {
    return Object.keys(db.topics);
}

// args: { host: string, topics: { name: string, format: string }[] }
module.exports.subscribe = function subscribe(args) {
    const { host, topics } = args;

    let id = args?.id ?? generateId();

    const invalidEntries = topics.filter(t => !fmts.supported.includes(t.format));

    if (!db.subscribers[id]) {
        db.subscribers[id] = {};
    }
    const subscriptions = db.subscribers[id];

    const validEntries = topics.filter(t => !invalidEntries.includes(t));
    validEntries.forEach(topic => {
        if (!(subscriptions[topic.name]?.format === topic.format && subscriptions[topic.name]?.host === host)) {
            subscriptions[topic.name] = { host, format: topic.format };

            if (!Object.keys(db.topics).includes(topic.name)) {
                db.topics[topic] = [];
            }
        }        
    });

    log(`Subscriber id ${id} subscribed to topics:`, JSON.stringify(validEntries));

    savePubsSubs(db);
    return {
        id,
        subscribed: Object.keys(db.subscribers[id]).map(topic => ({ topic, ...db.subscribers[id][topic] })),
        invalid: invalidEntries
    }
}

// args: { id: string, topics: string[]? }
module.exports.unsubscribe = function unsubscribe(args) {
    const { id, topics } = args;

    if (!db.subscribers[id]) {
        throw new Error("Subscription id not found");
    }

    if (!topics || topics.length === 0) {
        delete db.subscribers[id];

        log(`Subscriber id ${id} unsubscribed from all topics.`);

        return {
            id,
            message: 'Unsubscribed from all topics.'
        }
    }

    const subscriptions = db.subscribers[id];
    const unsubscribed = [];
    topics.forEach(topic => {
        if (subscriptions[topic]) {
            unsubscribed.push(topic);
            delete subscriptions[topic];
        }
    });

    log(`Subscriber id ${id}:\n    - unsubscribed from ${unsubscribed}\n    - remaining subscriptions: ${subscriptions}`);

    savePubsSubs(db);
    if (Object.keys(subscriptions).length === 0) {
        delete db.subscribers[id];
        return {
            id,
            message: 'Unsubscribed from all topics.'
        }
    } else {
        return {
            message: `Unsubscribed from ${count} topics.`,
            remaining: Object.keys(subscriptions).map(key => ({ topic: key, ...subscriptions[key] }))
        }
    }
}

// args: { id: string?, topics: { name: string, format: string }[] }
module.exports.register = function register(args) {
    const { topics } = args;

    let id = args?.id ?? generateId();

    if (!db.publishers[id]) {
        db.publishers[id] = {}
    }
    const publisher = db.publishers[id];

    const invalidEntries = topics.filter(t => !fmts.supported.includes(t.format));

    const validEntries = topics.filter(t => !invalidEntries.includes(t));
    validEntries.forEach(entry => {
        publisher[entry.name] = entry.format;

        if (!Object.keys(db.topics).includes(entry.name)) {
            db.topics[entry.name] = [];
        }
    });

    log(`Publisher id ${id} registered to topics:`, JSON.stringify(validEntries));

    savePubsSubs(db);
    return {
        id,
        registered: validEntries,
        invalid: invalidEntries
    }
}

// args: { id: string, topic: string: message: string }
module.exports.post = function post(args) {
    const { id, topic, message } = args;
    if (!db.publishers[id] || !db.publishers[id][topic]) {
        throw new Error("Must register to topic before posting a message.");
    }

    try {
        const format = db.publishers[id][topic];
        let jsonMessage = null;
        switch(format) {
            case 'xml':
                jsonMessage = fmts.xml2json(message);
                break;
            case 'csv':
                jsonMessage = fmts.csv2json(message);
                break;
            case 'tsv':
                jsonMessage = fmts.tsv2json(message);
                break;
            case 'json':
                jsonMessage = JSON.parse(message);
                break;
        }

        const result = {
            timestamp: new Date().valueOf(),
            content: jsonMessage
        };

        log(`Received message from publisher ${id} in topic "${topic}"\n`, { id, topic, message });

        db.topics[topic].push(result);
        saveMessage(topic, result).catch(console.error);
    } catch (err) {
        console.error(err);
    }
}

async function notifySubscribers(topic, message) {
    const subscribers = Object
        .keys(db.subscribers)
        .filter(id => db.subscribers[id] && db.subscribers[id][topic])
        .map(id => db.subscribers[id][topic]);

    const csv = subscribers.some(sub => sub.format === 'csv') ? fmts.json2csv(message) : null;
    const tsv = subscribers.some(sub => sub.format === 'tsv') ? fmts.json2tsv(message) : null;
    const xml = subscribers.some(sub => sub.format === 'xml') ? fmts.json2xml(message) : null;

    const promises = [];
    subscribers.forEach(sub => {
        let msg;
        switch (sub.format) {
            case 'csv':
                msg = csv;
                break;
            case 'json':
                msg = JSON.stringify(message);
                break;
            case 'tsv':
                msg = tsv;
                break;
            case 'xml':
                msg = xml;
                break;
        }

        promises.push(axios.post(`http://${sub.host}`, { topic, message: msg }));
    });

    const res = await Promise.allSettled(promises);
    const numSucceeded = res.filter(e => e.status === 'fulfilled').length;
    return {
        total: res.length,
        successful: numSucceeded,
        failed: res.length - numSucceeded,
    };
}

// args: { topic: string, format: string, timestamp: string? }
module.exports.replay = async function replay(args) {
    const { topic, format, timestamp } = args;
    if (!db.topics[topic]) {
        throw new Error("Unknown topic");
    }
    if (!fmts.supported.includes(format)) {
        throw new Error("Unknown format");
    }

    let convert;
    switch (format) {
        case 'csv':
            convert = fmts.json2csv;
            break;
        case 'json':
            convert = data => data;
            break;
        case 'tsv':
            convert = fmts.json2tsv;
            break;
        case 'xml':
            convert = fmts.json2xml;
            break;
    }

    return getMessages(topic, timestamp)
        .then(messages => convert(messages));
}