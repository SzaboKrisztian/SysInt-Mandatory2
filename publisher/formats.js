const { parse: csvDecode } = require('csv/lib/sync');
const { stringify: csvEncode } = require('csv/lib/sync');
const { parse: xml2js, j2xParser } = require('fast-xml-parser');

const encoderOptions = {
    attributeNamePrefix : "@_",
    attrNodeName: "@",
    textNodeName : "#text",
    ignoreAttributes : true,
    cdataTagName: "__cdata",
    cdataPositionChar: "\\c",
    format: false,
    indentBy: "  ",
    supressEmptyNode: false,
    rootNodeName: "root"
};

const decoderOptions = {
    attributeNamePrefix : "@_",
    attrNodeName: "attr",
    textNodeName : "#text",
    ignoreAttributes : true,
    ignoreNameSpace : false,
    allowBooleanAttributes : false,
    parseNodeValue : true,
    parseAttributeValue : false,
    trimValues: true,
    cdataTagName: "__cdata",
    cdataPositionChar: "\\c",
    parseTrueNumberOnly: false,
    numParseOptions:{
      hex: true,
      leadingZeros: true,
    },
    arrayMode: false,
    stopNodes: ["parse-me-as-string"],
    alwaysCreateTextNode: false
};
const js2xml = new j2xParser(encoderOptions);

module.exports = {
    supported: ['json', 'xml', 'csv', 'tsv'],
    csv2json(data) {
        const res = csvDecode(data, {
            delimiter: ',',
            header: true,
            skipEmptyLines: true,
            columns: true,
            cast: true
        });
        return res.length === 1 ? res[0] : res;
    },
    tsv2json(data) {
        const res = csvDecode(data, {
            delimiter: '\t',
            header: true,
            skipEmptyLines: true,
            columns: true,
            cast: true
        });
        return res.length === 1 ? res[0] : res;
    },
    xml2json(data) {
        const res = xml2js(data, decoderOptions);
        const props = Object.keys(res);
        return props.length === 1 && res.root ? res.root : res; 
    },
    json2csv(data) {
        data = Array.isArray(data) ? data : [data];
        return csvEncode(data, {
            delimiter: ',',
            header: true,
            quote: true
        });
    },
    json2tsv(data) {
        data = Array.isArray(data) ? data : [data];
        return csvEncode(data, {
            delimiter: '\t',
            header: true,
        });
    },
    json2xml(data) {
        return js2xml.parse(data, encoderOptions);
    }
}