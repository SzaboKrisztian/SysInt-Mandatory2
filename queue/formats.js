const { parse: csvDecode } = require('csv/lib/sync');
const { stringify: csvEncode } = require('csv/lib/sync');
const { xml2json: xmlDecode, json2xml: xmlEncode } = require('xml-js');

module.exports = {
    supported: ['json', 'xml', 'csv', 'tsv'],
    csv2json(data) {
        return csvDecode(data, {
            delimiter: ',',
            skipEmptyLines: true,
        });
    },
    tsv2json(data) {
        return csvDecode(data, {
            delimiter: '\t',
            skipEmptyLines: true,
        });
    },
    xml2json(data) {
        return xmlDecode(data, {
            compact: true
        });
    },
    json2csv(data) {
        return csvEncode(data, {
            delimiter: ','
        });
    },
    json2tsv(data) {
        return csvEncode(data, {
            delimiter: '\t'
        });
    },
    json2xml(data) {
        return xmlEncode(data, {
            compact: true
        });
    }
}