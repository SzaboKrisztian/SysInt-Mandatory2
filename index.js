const path = require("path");
const fs = require("fs/promises");

const supportedFormats = ['json', 'xml', 'csv'];

const data = {
    subscribers: [],
    topics: {},
}

const FS_ROOT = path.resolve('.');
const FS_SUBS = path.resolve(FS_ROOT, 'subscribers');
const FS_TOPICS = path.resolve(FS_ROOT, 'topics');

fs.mkdir(FS_SUBS).catch(() => {});
fs.mkdir(FS_TOPICS).catch(() => {});

function getTopics() {
    return fs.readdir(FS_TOPICS, { withFileTypes: true })
        .then(data => data.filter(item => item.isDirectory()))
        .then(dirs => dirs.map(dir => dir.name));
}

function getSubscribers() {
    return fs.readdir(FS_SUBS, { withFileTypes: true })
        .then(contents => contents.filter(item => item.isFile()))
        .then(files => files.map(sub => sub.name))
        .then(files => files.map(sub => fs.readFile(path.resolve(FS_SUBS, sub), 'utf-8')))
        .then(filesData => Promise.allSettled(filesData))
        .then(subs => subs
            .filter(sub => sub.status === 'fulfilled')
            .map(sub => sub.value.split('\n'))
            .filter(sub => sub.length > 1) // At least header + 1 sub
            .map(sub => {
                const [name, host] = sub[0].split(',');
                const topics = sub.slice(1);
                return {
                    name,
                    host,
                    topics: topics
                        .map(entry => entry.split(','))
                        .map(topic => ({ name: topic[0], format: topic[1] }))
                }
            }));
}

function subscribe(name, host, subscriptions) {
    if (!subscriptions.some(sub => supportedFormats.includes(sub.format))) {
        throw new Error("Unknown format");
    }
    const entry = {
        name,
        host,
        topics: subscriptions.filter(sub => sub.topic !== undefined && sub.format !== undefined)
    };
    data.subscribers.push(entry);
    subscriptions.forEach(sub => {
        const old = data.topics[sub.topic] ?? [];
        data.topics[sub.topic] = [
            ...old,
            {
                name,
                host,
                format: sub.format
            }
        ];
    });
    const topic = path.resolve(FS_TOPICS, name);
    fs.mkdir(topic)
        .catch(() => {});
}

function post(topic, message) {
}

function notify(topic, message) {
    if (!data.topics[topic]) {
        return;
    }
    data.topics[topic].map()
}

getTopics().then(console.log);
getSubscribers().then(subs => {
    console.log(JSON.stringify(subs, null, 2))
    data.subscribers.push(...subs);
    subscribe('test', 'host', [{ topic: 'topic1', format: 'xml' }]);
});