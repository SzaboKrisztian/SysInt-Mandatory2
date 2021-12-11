const { json2csv, json2tsv, json2xml, csv2json, tsv2json, xml2json } = require('../formats');

describe('format conversion test', () => {
    const jsonData = [
        {
            number: 1234,
            string: "hello world",
            // boolean: true,
            // array: [1, 2],
            // object: { test: 1 }
        },
        [
            {
                number: 1234, 
                string: "hello world",
                // boolean: true,
                // array: [1, 2],
                // object: { test: 1 }
            },
            {
                number: 4321,
                string: "dlrow olleh",
                // boolean: false,
                // array: [2, 1],
                // object: { tset: 2 }
            }
        ]
    ];
    const csvData = [
        'number,string\n1234,hello world\n',
        'number,string\n1234,hello world\n4321,dlrow olleh\n'
    ];
    const tsvData = [
        'number\tstring\n1234\thello world\n',
        'number\tstring\n1234\thello world\n4321\tdlrow olleh\n'
    ];
    const xmlData = [
        '<number>1234</number><string>hello world</string>',
        '<root><number>1234</number><string>hello world</string></root><root><number>4321</number><string>dlrow olleh</string></root>'
    ];

    test('json2csv <-> csv2json', () => {
        jsonData.forEach(initial => {
            const csv = json2csv(initial);

            const json = csv2json(csv);
    
            expect(json).toMatchObject(initial);
        });
    });

    test('csv2json <-> json2csv', () => {
        csvData.forEach(initial => {
            const json = csv2json(initial);

            const csv = json2csv(json);
    
            expect(csv).toMatch(initial);
        });        
    });

    test('json2tsv <-> tsv2json', () => {
        jsonData.forEach(initial => {
            const tsv = json2tsv(initial);

            const json = tsv2json(tsv);

            expect(json).toMatchObject(initial);
        });
    });

    test('tsv2json <-> json2tsv', () => {
        tsvData.forEach(initial => {
            const json = tsv2json(initial);

            const tsv = json2tsv(json);

            expect(tsv).toMatch(initial);
        });
    });

    test('json2xml <-> xml2json', () => {
        jsonData.forEach(initial => {
            const xml = json2xml(initial);

            const json = xml2json(xml);

            expect(json).toMatchObject(initial);
        });
    });

    test('xml2json <-> json2xml', () => {
        xmlData.forEach(initial => {
            const json = xml2json(initial);

            const xml = json2xml(json);

            expect(xml).toMatch(initial);
        });
    });
});
