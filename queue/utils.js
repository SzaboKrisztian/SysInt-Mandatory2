module.exports.formatDate = function(date) {
    return date.toLocaleString('en-GB', { hour12: false });
}

module.exports.generateId = function() {
    const timestamp = new Date().valueOf().toString(10);
    const random = `${Math.random().toString(36).substr(3, 10)}`;
    const id = timestamp
        .split('')
        .map((char, i) => `${char}${random.charAt(i)}`)
        .join('');

    return id;
}

module.exports.log = function(...args) {
    console.log(`\n --- ${module.exports.formatDate(new Date())}:`);
    console.log(...args);
}