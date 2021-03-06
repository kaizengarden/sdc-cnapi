#!/usr/node/bin/node
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2014, Joyent, Inc.
 */

var dox = require('dox');
var fs = require('fs');
var sprintf = require('sprintf').sprintf;
var file = require('file');
var async = require('async');
var path = require('path');

function parse(document) {
    var parsed = {};

    for (var idx in document) {
        var chunk = document[idx];
        if (chunk.ignore) {
            continue;
        }

        var block = { params: [], responses: []};
        block.summary = chunk.description.summary;
        block.body = chunk.description.body;

        for (var tagIdx in chunk.tags) {
            handleTag(block, chunk, tagIdx);
        }
        if (block.name) {
            if (!parsed[block.section]) {
                parsed[block.section] = [];
            }
            parsed[block.section].push(block);
        }

    }

    return parsed;
}


function handleTag(block, chunk, idx) {
    var tag = chunk.tags[idx];
    var m;
    switch (tag.type) {
        case 'name':
            block.name = tag.string;
            break;
        case 'endpoint':
            block.endpoint = tag.string;
            break;
        case 'section':
            block.section = tag.string;
            break;
        case 'param':
            block.params.push({
                name: tag.name,
                type: tag.types[0],
                description: tag.description
            });
            break;
        case 'response':
            m = (/^(\w+?)\s+(\w+?)\s+(.*)/g).exec(tag.string);
            block.responses.push({
                code: m[1], type: m[2], required: true, description: m[3]
            });
            break;
        default:
            break;
    }
}

function processFile(fn) {
    var contents = fs.readFileSync(fn).toString();
    var a = dox.parseComments(contents, { raw: true });
    var doc = parse(a);

    return doc;
}

function getTableCellWidths(params) {
    var widths = params.headers.map(function (h) { return h.length; });

    params.data.forEach(function (row) {
        for (var i in params.fields) {
            var field = params.fields[i];

            if (row.hasOwnProperty(field) &&
                row[field].length > widths[i] ||
                !widths[i])
            {
                if (i > widths.length)  {
                    widths.push(row[field].length);
                } else {
                    widths[i] = row[field].length;
                }
            }
        }
    });

    return widths;
}

function makeTable(params) {
    var fields = params.fields;
    var widths = getTableCellWidths(params);

    var rowsout = [];
    params.data.forEach(function (row) {
        var rowout = [];

        var i;
        for (i in fields) {
            var field = fields[i];
            if (row.hasOwnProperty(field)) {
                rowout.push(row[field]);
            } else {
                rowout.push('');
            }
        }
        rowsout.push(rowout);
    });

    var padded = [];
    var headerlines = '';
    var headerout;

    headerout = '| ' + params.headers.map(function (c, w) {
        return sprintf('%-'+widths[w]+'s', c);
    }).join(' | ') + ' |';

    headerlines = '| ' + fields.map(function (f, fi) {
        return (new Array(1+widths[fi])).join('-');
    }).join(' | ') + ' |';

    padded = rowsout.map(function (row) {
        return '| ' + row.map(function (c, w) {
            return sprintf('%-'+widths[w]+'s', c);
        }).join(' | ') + ' |';
    });

    return headerout + '\n' + headerlines + '\n' + padded.join('\n');
}

function main() {
    if (process.argv.length < 3) {
        console.error('Error: Insufficient number of arguments');
        console.error('%s %s <directory>', process.argv[0], process.argv[1]);
        process.exit(1);
    }

    var data = fs.readFileSync(__dirname + '/../package.json');
    var pkg = JSON.parse(data.toString());

    var files = [];
    file.walkSync(process.argv[2], function (dir, dirs, filenames) {
        filenames.forEach(function (fn) {
            if (/\.js$/.exec(fn)) {
                files.push(path.join(dir, fn));
            }
        });
    });

    var parsed = {};

    files.forEach(function (fn) {
        var doc = processFile(fn);

        for (var s in doc) {
            parsed[s] = doc[s];
        }
    });

    var ejs = require('ejs');
    var expanded = ejs.render(fs.readFileSync(
        __dirname + '/../docs/index/index.md.ejs').toString(),
        { package: pkg, makeTable: makeTable, doc: parsed });
    process.stdout.write(expanded);
}

main();
