const fmts = require('./formats');
const { } = require('./persistence');
const axios = require('axios').default;

const db = {
    publishers: {
        a: { test: 'json' }
    },
    subscribers: {},
    topics: {
        test: []
    },
}

module.exports.getTopics = function getTopics() {
    return Object.keys(db.topics);
}

function generatePublisherId() {
    let id = null;

    do {
        id = Math.random().toString(36).substr(2, 8);
    } while (Object.keys(db.publishers).includes(id));

    return id;
}

module.exports.subscribe = function subscribe(args) {
    const { host, topic, format } = args;

    if (!fmts.supported.includes(format)) {
        throw new Error("Unknown format");
    }

    const subscriptions = db.subscribers[host] ?? {};

    if (subscriptions[topic] === format) {
        throw new Error("Identical subscription already exists. No action taken.")
    } else {
        subscriptions[topic] = format;
    }

    if (!Object.keys(db.topics).includes(topic)) {
        db.topics[topic] = [];
    }

    return {
        host,
        subscriptions: Object.keys(subscriptions).map(key => ({ topic: key, format: subscriptions[key] }))
    }
}

module.exports.unsubscribe = function unsubscribe(args) {
    const { host, topic } = args;

    if (!db.subscribers[host] || !db.subscribers[host][topic]) {
        throw new Error("Subscription not found");
    }

    const subscriptions = db.subscribers[host];
    delete subscriptions[topic];

    if (Object.keys(subscriptions).length === 0) {
        delete db.subscribers[host];
    }

    return {
        host,
        subscriptions: Object.keys(subscriptions).map(key => ({ topic: key, format: subscriptions[key] }))
    }
}

module.exports.register = function register(args) {
    const { topic, format } = args;

    if (!fmts.supported.includes(format)) {
        throw new Error("Unknown format");
    }

    const id = generatePublisherId();
    db.publishers[id] = {
        [topic]: format
    }

    if (!Object.keys(db.topics).includes(topic)) {
        db.topics[topic] = [];
    }

    return {
        id,
        topic,
        format
    }
}

module.exports.post = function post(args) {
    const { id, topic, message } = args;
    if (!db.publishers[id]) {
        throw new Error("Must register before posting message to a topic.");
    }

    const format = db.publishers[id][topic];
    let jsonMessage = null;
    switch(format) {
        case 'xml':
            jsonMessage = JSON.parse(fmts.xml2json(message));
            break;
        case 'csv':
            jsonMessage = JSON.parse(fmts.csv2json(message));
            break;
        case 'tsv':
            jsonMessage = JSON.parse(fmts.tsv2json(message));
            break;
        case 'json':
            jsonMessage = message;
            break;
    }
    db.topics[topic].push({
        timestamp: new Date().toISOString(),
        content: jsonMessage
    });

    return notifySubscribers(topic, jsonMessage);
}

function notifySubscribers(topic, message) {
    const subscribers = Object
        .keys(db.subscribers)
        .filter(host => db.subscribers[host][topic] !== undefined)
        .map(host => ({ host, format: db.subscribers[host][topic] }));

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
                msg = message;
                break;
            case 'tsv':
                msg = tsv;
                break;
            case 'xml':
                msg = xml;
                break;
        }

        promises.push(axios.post(sub.host, msg));
    });

    return Promise.allSettled(promises).then(res => {
        const numSucceeded = res.filter(e => e.status === 'fulfilled').length;
        return {
            total: res.length,
            successful: numSucceeded,
            failed: res.length - numSucceeded,
        };
    });
}

module.exports.replay = function replay(args) {
    const { topic, format, timestamp } = args;
    if (!db.topics[topic]) {
        throw new Error("Unknown topic");
    }
    if (!fmts.supported.includes(format)) {
        throw new Error("Unknown format");
    }
    
    let ts;
    if (timestamp) {
        try {
            const date = new Date(timestamp);
            ts = date.toISOString();
        } catch (err) {
            throw new Error("Invalid timestamp");
        }
    }
    const startIdx = db.topics[topic]
        .findIndex(msg => msg.timestamp >= ts);

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

    const messages = db.topics[topic]
        .slice(startIdx < 0 ? 0 : startIdx)
        .map(msg => msg.content);

    return convert(messages);
}