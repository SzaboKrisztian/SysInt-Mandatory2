const path = require("path");
const fs = require("fs/promises");

const supportedFormats = {
    json: 1,
    xml: 2,
    csv: 3
}

const data = {
    subscribers: [],
    topics: {},
}

const FS_ROOT = path.resolve('.');
const FS_SUBS = path.resolve(FS_ROOT, 'subscribers');
const FS_TOPICS = path.resolve(FS_ROOT, 'topics');

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
        .then(subs => subs.map(sub => sub.value.split('\n')))
        .then(subs => subs.filter(sub => sub.length > 1))
        .then(subs => subs.map(sub => ({
            name: sub[0].split(',')[0],
            host: sub[0].split(',')[1],
            topics: sub.slice(1)
                .map(entry => entry.split(','))
                .map(topic => ({ name: topic[0], format: topic[1] }))
        }))
    );
}

function subscribe(name, host, subscriptions) {
    const entry = {
        name,
        host,
        topics: subscriptions.filter(sub => sub.topic !== undefined && sub.format !== undefined)
    };
    data.subscribers.push(entry);
    subscriptions.forEach(sub => {
        data.topics[sub.topic] = {
            name,
            host,
            format: sub.format
        };
    });
    const topic = path.resolve(FS_TOPICS, name);
    fs.mkdir(topic)
        .then(console.log('created folder', name))
        .catch(console.log('error creating folder', name));
}

function post(topic, message) {

}

getTopics().then(console.log);
getSubscribers().then(subs => {
    console.log(JSON.stringify(subs, null, 2))
    data.subscribers.push(...subs);
    subscribe('test', 'host', [{ topic: 'topic1', format: 'xml' }]);
});