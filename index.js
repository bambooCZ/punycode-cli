#!/usr/bin/env node

"use strict";

function error (message, exitCode = 255) {
    process.stderr.write(message + "\n");
    process.exit(exitCode);
}

function readAll (readStream) {
    return new Promise((resolve, reject) => {
        let onError, onData, onEnd;
        const finalize = () => {
            readStream.removeListener("data", onData);
            readStream.removeListener("end", onEnd);
            readStream.removeListener("error", onError);
        };

        let chunks = [];
        readStream.on("data", onData = (chunk) => chunks.push(chunk));
        readStream.on("error", onError = (err) => {
            finalize();
            reject(err);
        });
        readStream.on("end", onEnd = () => {
            finalize();
            resolve(Buffer.concat(chunks));
        });
        readStream.resume();
    });
}

function writeAll (writeStream, data) {
    return new Promise((resolve, reject) => {
        let onError, onDrain;
        const finalize = () => {
            writeStream.removeListener("error", onError);
            writeStream.removeListener("drain", onDrain);
        };

        writeStream.on("error", onError = (err) => {
            finalize();
            reject(err);
        });

        writeStream.on("drain", onDrain = () => {
            finalize();
            resolve();
        });

        if (!writeStream.write(data, null)) {
            finalize();
            process.nextTick(resolve);
        }
    });
}

const STRING_CHARSET = "utf-8";
const argv = process.argv;
let readStream = () => process.stdin,
    writeStream = () => process.stdout,
    decode = false;

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

        case "--decode":
        case "-D": {
            decode = true;
            break;
        }

        case "--input":
        case "-i": {
            const val = argv[++i];
            if (!(val && typeof val === "string")) error(`Value of "${param}" must be non-empty string`);
            if (val === "-") {
                readStream = () => process.stdin; // jshint ignore:line
            } else {
                readStream = () => require("fs").createReadStream(val, { autoClose: true, flags: "r", encoding: null }); // jshint ignore:line
            }
            break;
        }

        case "--output":
        case "-o": {
            const val = argv[++i];
            if (!(val && typeof val === "string")) error(`Value of "${param}" must be non-empty string`);
            if (val === "-") {
                writeStream = () => process.stdout; // jshint ignore:line
            } else {
                writeStream = () => require("fs").createWriteStream(val, { autoClose: true, flags: "w", encoding: null, mode: 0o644 }); // jshint ignore:line
            }
            break;
        }

        default: {
            error(`Invalid argument "${param}"`);
        }
    }
}

readAll(readStream()).then(
    (buffer) => {
        const data = buffer.toString(STRING_CHARSET);
        if (decode) {
            return require("punycode").toUnicode(data);
        } else {
            return require("punycode").toASCII(data);
        }
    }
).then(
    (processed) => {
        const ws = writeStream();
        return writeAll(ws, Buffer.from(processed, STRING_CHARSET)).then(
            () => {
                if (ws !== process.stdout) return new Promise((resolve, reject) => {
                    let onFinish, onError;
                    const finalize = () => {
                        ws.removeListener("error", onError);
                        ws.removeListener("finish", onFinish);
                    };

                    ws.on("error", onError = (err) => {
                        finalize();
                        reject(err);
                    });

                    ws.on("finish", onFinish = () => {
                        finalize();
                        resolve();
                    });

                    ws.end();
                });
            }
        );
    }
).catch(
    (err) => error(err.stack || err.message, 1)
);
