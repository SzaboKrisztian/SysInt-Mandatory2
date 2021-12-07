const path = require("path");
const fs = require("fs");
const fsp = fs.promises; 

const FS_ROOT = path.resolve('./data');

fsp.mkdir(FS_ROOT).catch(() => {});

const PUBSUB_FILE = path.resolve(FS_ROOT, 'pubsub.json');

module.exports.readTopics = async function readTopics() {
    const data = await fsp.readdir(FS_ROOT, { withFileTypes: true });
    return data.filter(item => item.isDirectory())
        .map(dir => dir.name);
}

module.exports.saveMessage = async function(topic, message) {
    const { content, timestamp } = message;

    const topicPath = path.resolve(FS_ROOT, topic);
    if (!fs.existsSync(topicPath)) {
        fs.mkdirSync(topicPath);
    }

    return fsp.writeFile(path.resolve(topicPath, `${timestamp}.json`), JSON.stringify(content), { encoding: 'utf-8' });
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
    const toSave = { subscribers: data.subscribers, publishers: data.publishers };
    try {
        await fsp.writeFile(PUBSUB_FILE, JSON.stringify(toSave), { encoding: 'utf-8' });
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

module.exports.clearTopic = function(topic) {
    const topicPath = path.resolve(FS_ROOT, topic);
    fsp.readdir(topicPath, { withFileTypes: true })
        .then(data => data.filter(item => item.isFile()))
        .then(files => files.forEach(file => fs.rmSync(path.resolve(topicPath, file.name))));
}

module.exports.clearAllTopics = function() {
    module.exports.readTopics().then(dirs => {
        dirs.forEach(dir => module.exports.clearTopic(dir));
    });
}

module.exports.deletePubSubFile = function() {
    if (fs.existsSync(PUBSUB_FILE)) {
        fs.rmSync(PUBSUB_FILE);
    }
}