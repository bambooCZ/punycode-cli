#!/usr/bin/env node

"use strict";

function error (message, exitCode = 255) {
    process.stderr.write(message + "\n");
    process.exit(exitCode);
}

function readAll (readStream) {
    return new Promise((resolve, reject) => {
        let chunks = [];
        readStream.on("data", (chunk) => chunks.push(chunk));
        readStream.on("error", (err) => reject(err));
        readStream.on("end", () => resolve(Buffer.concat(chunks)));
        readStream.resume();
    });
}

function writeAll (writeStream, data) {
    return new Promise((resolve, reject) => {
        writeStream.on('error', (err) => reject(err));
        writeStream.on('drain', () => resolve());
        writeStream.write(data, null);
    });
}


const argv = process.argv;
let readStream = process.stdin,
    writeStream = process.stdout,
    decode = false,
    charset = 'utf-8';

for (let i = 2, len = argv.length; i < len; i++) {
    let param = argv[i];
    switch (param) {
        case "--help":
        case "-h":
        case "-?": {
            process.stdout.write(`Usage:	${argv[1]} [-hD] [-i in_file] [-o out_file]
  -h, --help     display this message
  -D, --decode   decodes input
  -i, --input    input file (default: "-" for stdin)
  -o, --output   output file (default: "-" for stdout)
`);
            process.exit(0);
            break;
        }

        case "--charset": {
            let val = argv[++i];
            if (!(val && typeof val === "string")) error(`Value of "${param}" must be non-empty string`);
            charset = val;
            break;
        }

        case "--decode":
        case "-D": {
            decode = true;
            break;
        }

        case "--input":
        case "-i": {
            let val = argv[++i];
            if (!(val && typeof val === "string")) error(`Value of "${param}" must be non-empty string`);
            if (val === "-") {
                readStream = process.stdin;
            } else {
                readStream = require("fs").createReadStream(val, { autoClose: true, flags: "r", encoding: null });
            }
            break;
        }

        case "--output":
        case "-o": {
            let val = argv[++i];
            if (!(val && typeof val === "string")) error(`Value of "${param}" must be non-empty string`);
            if (val === "-") {
                writeStream = process.stdout;
            } else {
                writeStream = require("fs").createWriteStream(val, { autoClose: true, flags: "w", encoding: null, mode: 0o644 });
            }
            break;
        }

        default: {
            error(`Invalid argument '${param}'`);
        }
    }
}

readAll(readStream).then(
    (buffer) => {
        let data = buffer.toString(charset);
        if (decode) {
            return require("punycode").toUnicode(data);
        } else {
            return require("punycode").toASCII(data);
        }
    }
).then(
    (processed) => writeAll(writeStream, Buffer.from(processed, charset))
).then(
    () => process.exit(0),
    (err) => error(err.message, 1)
);
