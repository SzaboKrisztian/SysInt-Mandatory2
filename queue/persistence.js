const path = require("path");
const fs = require("fs/promises");

const FS_ROOT = path.resolve('./data');
const FS_TOPICS = path.resolve(FS_ROOT, 'topics');

fs.mkdir(FS_ROOT).catch(() => {});
fs.mkdir(FS_TOPICS).catch(() => {});

function readTopics() {
    return fs.readdir(FS_TOPICS, { withFileTypes: true })
        .then(data => data.filter(item => item.isDirectory()))
        .then(dirs => dirs.map(dir => dir.name));
}

function readSubscribers() {
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