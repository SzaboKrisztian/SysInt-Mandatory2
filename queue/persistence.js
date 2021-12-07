const path = require("path");
const fs = require("fs");
const fsp = fs.promises; 

const FS_ROOT = path.resolve('./data');

fsp.mkdir(FS_ROOT).catch(() => {});

const PUBSUB_FILE = path.resolve(FS_ROOT, 'pubsub.json');

module.exports.readTopics = function readTopics() {
    return fsp.readdir(FS_TOPICS, { withFileTypes: true })
        .then(data => data.filter(item => item.isDirectory()))
        .then(dirs => dirs.map(dir => dir.name));
}

module.exports.saveMessage = async function(topic, message) {
    const { content, timestamp } = message;

    const topicPath = path.resolve(FS_ROOT, topic);
    if (!fs.existsSync(topicPath)) {
        fs.mkdirSync(topicPath);
    }

    try {
        await fsp.writeFile(path.resolve(topicPath, `${timestamp}.json`), JSON.stringify(content));
        return true;
    } catch (err) {
        return false;
    }
}

module.exports.getMessages = async function(topic, timestamp) {
    timestamp = timestamp && typeof timestamp === 'string' ? parseInt(timestamp) : timestamp;

    const topicPath = path.resolve(FS_ROOT, topic);
    if (!fs.existsSync(topicPath)) {
        fs.mkdirSync(topicPath);
    }

    return Promise.allSettled(fsp.readdir(topicPath, { withFileTypes: true })
        .then(data => data.filter(item => item.isFile() && item.name.endsWith('json')))
        .then(files => files.map(file => file.name))
        .map(async filename => ({
            timestamp: filename.substring(0, filename.indexOf('.')),
            content: JSON.parse(await fsp.readFile(path.resolve(topicPath, filename)))
        })));
}

module.exports.savePubsSubs = async function(data) {
    try {
        await fsp.writeFile(PUBSUB_FILE, JSON.stringify(data), { encoding: 'utf-8' });
        return true;
    } catch (err) {
        return false;
    }
}

module.exports.loadPubsSubs = function() {
    try {
        return JSON.parse(fs.readFileSync(PUBSUB_FILE, { encoding: 'utf-8' }));
    } catch (err) {
        return null;
    }
}