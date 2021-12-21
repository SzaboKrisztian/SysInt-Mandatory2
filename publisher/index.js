const axios = require('axios').default;
const readline = require('readline');
const { json2csv, json2tsv, json2xml } = require('formats');
const faker = require('faker');

const r = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: '>> ' });

const QUEUE_HOST = '127.0.0.1';
const QUEUE_PORT = 3000;
const queueAddress = `${QUEUE_HOST}:${QUEUE_PORT}`;

const formats = ['json', 'xml', 'csv', 'tsv'];
const topics = ['people', 'cars', 'transactions', 'posts', 'requests', 'products'];

const topicData = formats.map(fmt => topics.map(t => ({ name: t, format: fmt })));

const promises = topicData.map(topics => axios.post(`http://${queueAddress}/api/publisher`, { topics }));

const publishers = {};

Promise.allSettled(promises).then((res) => {
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
    arg = !!arg && arg.startsWith('.') ? arg.substr(1) : arg;
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

async function sendMessage(id, topic, message) {
    if (!id || !topic) {
        showHelp('send');
    }

    if (id === '*') {
        const ids = Object.keys(publishers);
        const promises = ids.map(async (id) => await sendOne(id, topic, !message ? generateMessage(topic) : message, false));
        const result = await Promise.allSettled(promises);
        const numSent = result.filter(r => r.status === 'fulfilled').length;
        console.log(`Sent message from ${numSent}/${ids.length} publishers.`);
    } else {
        if (id.length < 20) {
            const idx = parseInt(id) - 1;
            id = Object.keys(publishers)[idx];
        }
        await sendOne(id, topic, !message ? generateMessage(topic) : message);
    }
}

function generateMessage(topic) {
    switch(topic) {
        case 'people':
            return {
                firstName: faker.name.firstName(),
                lastName: faker.name.lastName(),
                gender: faker.name.gender(),
                age: faker.datatype.number(45) + 20,
                location: `${faker.address.county()}, ${faker.address.country()}`,
            };
        case 'cars':
            return {
                make: faker.vehicle.manufacturer(),
                model: faker.vehicle.model(),
                year: faker.datatype.number(30) + 1989,
                color: faker.vehicle.color(),
                vin: faker.vehicle.vin(),
            }
        case 'products':
            return {
                name: faker.commerce.productName(),
                category: faker.commerce.product(),
                color: faker.commerce.color(),
                price: faker.commerce.price(),
                description: faker.commerce.productDescription()
            }
        case 'transactions':
            return {
                source: faker.finance.account(),
                sourceName: faker.finance.accountName(),
                destination: faker.finance.iban(),
                currency: faker.finance.currencyCode(),
                amount: faker.finance.amount()
            }
        case 'requests':
            return {
                method: faker.internet.httpMethod(),
                source: faker.internet.ip(),
                userAgent: faker.internet.userAgent(),
                timestamp: faker.date.recent(),
                mimeType: faker.system.mimeType()
            }
        case 'posts':
            return {
                author: `${faker.name.firstName()} ${faker.name.lastName()}`,
                title: faker.lorem.words(),
                text: faker.lorem.paragraph(),
                timestamp: faker.date.recent(),
                upvotes: faker.datatype.number(1000)
            }
    }
}

function sendOne(id, topic, message, verbose = true) {
    const format = publishers[id][topic];
    if (verbose && !format) {
        console.log('Unknown id and/or topic. Aborting.');
        return Promise.reject(false);
    }

    let msg;
    try {
        msg = typeof message === 'string' ? JSON.parse(message) : message;
    } catch {
        console.log('Invalid JSON:', message);
        return Promise.reject(false);
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

    console.log({ message: msg });
    const p = axios.post(`http://${queueAddress}/api/message`, data);
    if (verbose) {
        p.then(() => console.log('Message successfully sent.'))
        .catch(res => console.log('Error from queue:', res.response.data));
    }

    return Promise.resolve(true);
}