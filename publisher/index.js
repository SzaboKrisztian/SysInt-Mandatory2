const axios = require('axios').default;
const readline = require('readline');
const { json2csv, json2tsv, json2xml } = require('./formats');

const r = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: '>> ' });

const QUEUE_HOST = '127.0.0.1';
const QUEUE_PORT = 3000;
const queueAddress = `${QUEUE_HOST}:${QUEUE_PORT}`;

const formats = ['json', 'xml', 'csv', 'tsv'];
const topics = ['people', 'cars', 'phones', 'laptops', 'movies', 'bands'];

const topicData = formats.map(fmt => topics.map(t => ({ name: t, format: fmt })));

const promises = topicData.map(topics => axios.post(`http://${queueAddress}/api/publisher`, { topics }));

const publishers = {};

Promise.allSettled(promises).then(async (res) => {
    for (let i = 0; i < res.length; i += 1) {
        if (res[i].status === 'fulfilled') {
            publishers[res[i].value.data.id] = {};
            const publisher = publishers[res[i].value.data.id];
            topicData[i].forEach(e => publisher[e.name] = e.format);
        }
    }
    console.log('Registered publishers:', publishers);

    r.prompt();
    r.on('line', (line) => {
        line = line.trim();
        if (line.charAt(0) === '.') {
            executeCommand(line);
        }
        r.prompt();
    });
});

function executeCommand(command) {
    const tokens = command.split(' ');
    command = tokens[0];
    const args = tokens.slice(1);
    switch (command) {
        case '.help':
            showHelp(args[0]);
            break;
        case '.send':
            sendMessage(...args);
            break;
        case '.quit':
            r.close();
            process.exit(0);
        default:
            console.log('Unrecognized command');
            break;
    }
}

function showHelp(arg) {
    arg = arg.startsWith('.') ? arg.substr(1) : arg;
    switch (arg) {
        case 'send':
            console.log('Usage:\n.send <id> <topic> <message> - send a message to the queue from a publisher');
            console.log('Message should be JSON, which will be automatically converted to publishers declared format before sending.');
            console.log('If id is *, will attempt to send same message from all publishers.');
            break;
        case 'help':
            console.log('Usage:\n.help <command>');
            console.log('Show help information about the command');            
            break;
        case 'quit':
            console.log('Usage:\n.quit');
            console.log('Quits the program.');
            break;
        default:
            console.log('Unknown command');
            console.log('Commands:');
            console.log(' .help, .send, .quit');
    }
    
}

function sendMessage(id, topic, message) {
    if (!id || !topic || !message) {
        showHelp('send');
    }

    if (id === '*') {
        let sent = 0;
        Object.keys(publishers).forEach(id => {
            try {
                if (sendOne(id, topic, message, false)) {
                    sent += 1;
                }
            } catch {}
        });
        console.log(`Sent message from ${sent}/${Object.keys(publishers).length} publishers.`);
    } else {
        if (id.length < 20) {
            const idx = parseInt(id) - 1;
            id = Object.keys(publishers)[idx];
        }
        sendOne(id, topic, message);
    }
}

function sendOne(id, topic, message, verbose = true) {
    const format = publishers[id][topic];
    if (verbose && !format) {
        console.log('Unknown id and/or topic. Aborting.');
        return false;
    }

    let msg;
    try {
        msg = JSON.parse(message);
    } catch {
        console.log('Invalid JSON:', message);
        return false;
    }
    switch (format) {
        case 'csv':
            msg = json2csv(msg);
            break;
        case 'json':
            msg = message;
            break;
        case 'tsv':
            msg = json2tsv(msg);
            break;
        case 'xml':
            msg = json2xml(msg);
            break;
    }

    const data = {
        id,
        topic,
        message: msg
    }


    const p = axios.post(`http://${queueAddress}/api/message`, data);
    if (verbose) {
        p.then(() => console.log('Message successfully sent.'))
        .catch(res => console.log('Error from queue:', res.response.data));
    }

    return true;
}