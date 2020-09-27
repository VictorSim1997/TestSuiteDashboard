// Make it easier to use console.log
var log = console.log.bind(console);
//=============================================================================
//=============================================================================
var express = require('express');
var app = express();
var http = require('http').Server(app);


const hostname = '127.0.0.1';
const port = 3000;

http.listen(port, function () {
    console.log('Server running at http://' + hostname + ':' + port + '/');
    console.log('Current dir is ' + __dirname);
});

app.use(express.static(__dirname + '/public'));
//=============================================================================

//=============================================================================
//=============================================================================
var fs = require('fs');

// Read layout file
var configFile = __dirname + '/config/layout.txt';

var rawConfig = fs.readFileSync(configFile).toString().split('\r\n');
var config = [];
for (i in rawConfig) {
    // Remove empty lines
    if (rawConfig[i]) {
        config.push(rawConfig[i]);
    }
}

const keys = ["Product", "Branch", "Type", "Platforms", "Tests"];
const keysPerTable = keys.length;

var isValidLayout = true;

var lineNo = 0;
var pages = [];

// Storing information from the config file to the pages structure
addPages:
while (lineNo < config.length) {
    // Add one to the line number to skip the line where it says page number
    lineNo += 1;

    let tables = [];
    do {
        var table = getTable(config, lineNo);
        for (var key in table) {
            if (!table[key]) {
                isValidLayout = false;
                break addPages;
            }
        }
        tables.push(table);
        lineNo += keysPerTable;

        if (lineNo >= config.length)
            break;
    } while (config[lineNo].includes('Page:') === false);
    pages.push(tables);
}

// Gets information from the config file and stores it as an object with member variables
function getTable(a_config, a_lineNo) {
    let product, branch, type, platforms, tests;
    for (var i = 0; i < keysPerTable; i++) {
        var split = a_config[a_lineNo + i].split(":");

        var key = split[0].trim();

        var list = split[1].split(",");
        list.forEach(function (entry, i) {
            list[i] = entry.trim();
        });

        switch (key) {
            case "Product":
                product = list;
                break;
            case "Branch":
                branch = list;
                break;
            case "Type":
                type = list;
                break;
            case "Platforms":
                platforms = list;
                break;
            case "Tests":
                tests = list;
                break;
            default:
                [product, branch, type, platforms, tests] = Array(5).fill(null);
                break;
        }
    }
    let table = { Product: product, Branch: branch, Type: type, Platforms: platforms, Tests: tests };
    return table;
}
//=============================================================================

//=============================================================================
//=============================================================================

// Read jenkins build report file
function readJenkinsBuildReport(a_buildReport) {
    var lines
    // Take into account the different line endings used by Unix (Red Hat) and Windows
    if (a_buildReport.includes("Red Hat")) {
        lines = fs.readFileSync(a_buildReport).toString().split('\n');
    } else {
        lines = fs.readFileSync(a_buildReport).toString().split('\r\n');
    }
    var newLines = [];
    for (i in lines) {
        // Remove empty lines
        if (lines[i]) {
            newLines.push(lines[i]);
        }
    }

    var reportMap = new Map();

    reportMap.set("Product", reportValue(newLines, "Product::"));
    reportMap.set("Branch", reportValue(newLines, "Branch::"));
    reportMap.set("Type", reportValue(newLines, "Type::"));
    reportMap.set("TestName", reportValue(newLines, "TestName::"));
    reportMap.set("Platform", reportValue(newLines, "Platform::"));
    reportMap.set("Time", reportValue(newLines, "Time::"));
    reportMap.set("Refresh", reportValue(newLines, "Refresh::"));
    reportMap.set("Pass", reportValue(newLines, "Pass::"));
    reportMap.set("Fail", reportValue(newLines, "Fail::"));

    return reportMap;
}


function reportValue(a_report, a_key) {
    var value = null;
    for (i in a_report) {
        if (a_report[i].search(a_key) != -1) {
            var split = a_report[i].split("::");
            value = split[1].trim();
        }
    }
    return value;
}

function checkIsValid(a_reportMap) {
    var faultyKeys = [];
    a_reportMap.forEach(function (value, key) {
        if (value == null)
            faultyKeys.push(key);
    });
    return faultyKeys;
}
//=============================================================================

//=============================================================================
//=============================================================================
var io = require('socket.io')(http);

var noOfClients = 0;

io.on('connection', function (socket) {
    console.log('\nClient connected');
    console.log('Socket id: ' + socket.id);
    noOfClients += 1;
    console.log('Total no of clients: ' + noOfClients);


    // Create tables and populate it to the client which just connected
    if (isValidLayout) {
        socket.emit('initialise', pages);
        populateTables(socket);
    // Send message saying layout file cannot be parsed correctly
    } else {
        socket.emit('invalidLayout');
    }

    socket.on('disconnect', function (reason) {
        console.log('\nClient disconnected');
        console.log('Socket id: ' + socket.id);
        console.log('Reason: ' + reason);
        noOfClients -= 1;
        console.log('Total no of clients: ' + noOfClients);
    });

});

function populateTables(socket) {
    fs.readdir(testDir, function (err, files) {
        if (err) {
            console.log('ERROR: Directory doesnt exist');
            return;
        }
        files.forEach(function (file) {
            var reportMap = readJenkinsBuildReport(testDir + '/' + file);

            var faultyKeys = checkIsValid(reportMap);
            if (faultyKeys.length == 0) {
                // Is valid
                socket.emit('add', { Event: 'add',
                                     File: testDir + '/' + file,
                                     FaultyKeys: faultyKeys,
                                     Report: JSON.stringify(Array.from(reportMap)) });
            } else {
                // Is not valid
                socket.emit('setErr', { Event: 'setErr', 
                                      File: testDir + '/' + file,
                                      FaultyKeys: faultyKeys,
                                      Report: JSON.stringify(Array.from(reportMap)) });
            }
        });
    });
}
//=============================================================================

//=============================================================================
//=============================================================================
var chokidar = require('chokidar');

function emitEvent(event, file, faultyKeys, report) {
    io.emit(event, { Event: event,
                     File: file,
                     FaultyKeys: faultyKeys,
                     Report: report });
}

// Default location of dashboard logs
var testDir = __dirname + '/tests';

// Location used by live dashboard. Network server location is used so that both
// Unix and Windows OS's can write to the location.
//var testDir = '//svr-ies-net-01/mad_home2/jenkins/dashboard-logs';

// Create event listeners.
var watchDir = chokidar.watch(testDir, {
    ignored: /(^|[\/\\])\../,
    persistent: true
});

var reports = new Map();
var faultyReports = [];

watchDir
    .on('add', testDir => {
        log('File ' + testDir + ' has been added');
        var reportMap = readJenkinsBuildReport(testDir);

        var faultyKeys = checkIsValid(reportMap);

        if (faultyKeys.length == 0) {
            // Is valid
            reports.set(testDir, reportMap);
            emitEvent('add', testDir, faultyKeys, JSON.stringify(Array.from(reportMap)));
        } else {
            // Is not valid
            faultyReports.push(testDir);
            emitEvent('setErr', testDir, faultyKeys, JSON.stringify(Array.from(reportMap)));
        }
    })

    .on('change', testDir => {
        log('File ' + testDir + ' has been changed');
        var reportMap = readJenkinsBuildReport(testDir);

        var faultyKeys = checkIsValid(reportMap);

        if (faultyKeys.length == 0) {
            // Is valid
            reports.set(testDir, reportMap);
            emitEvent('change', testDir, faultyKeys, JSON.stringify(Array.from(reportMap)));
            // Check if file changed was file with error
            if (faultyReports.includes(testDir)) {
                let indexPos = faultyReports.indexOf(testDir);
                faultyReports.splice(indexPos, 1);
                emitEvent('removeErr', testDir, faultyKeys, JSON.stringify(Array.from(reportMap)));
            }
        } else {
            // Is not valid
            // Checks if this file was faulty before as to not display the same file twice
            var wasFaultyFile = false
            wasFaultyFile = faultyReports.some(function (file) {
                return testDir === file;
            });
            if (!wasFaultyFile)
                faultyReports.push(testDir);
            emitEvent('setErr', testDir, faultyKeys, JSON.stringify(Array.from(reportMap)));
        }
    })

    .on('unlink', testDir => {
        var reportMap = reports.get(testDir);
        log('File ' + testDir + ' has been removed');

        if (reportMap) {
            emitEvent('unlink', testDir, [], JSON.stringify(Array.from(reportMap)));
            reports.delete(testDir);
        } else {
            let indexPos = faultyReports.indexOf(testDir);
            faultyReports.splice(indexPos, 1);
            emitEvent('removeErr', testDir);
        }
    });
//=============================================================================

//=============================================================================
//=============================================================================
const msecPerSec = 1 * 1000;
const msecPerMinute = msecPerSec * 60;

// Set the time in minutes to check for stale builds
const updateInterval = 30;
var staleCounter = updateInterval;

setInterval(updateCounterValue, msecPerMinute);

setInterval(updateStaleReports, updateInterval * msecPerMinute);

function updateCounterValue() {
    staleCounter -= 1;
    if (staleCounter === 0)
        staleCounter = updateInterval;
    io.emit('updateCounter', { counter: staleCounter });
}

function updateStaleReports() {
    log("updateStaleReports fired");
    let currentTime = new Date();
    reports.forEach(function (value, key) {
        if (checkStale(value, currentTime)) {
            log(key + " has gone stale");
            io.emit('stale', { Event: "stale",
                               File: key,
                               Report: JSON.stringify(Array.from(value)) });
        }
    });
}


function checkStale(a_report, a_currentTime) {
    let stale = false;

    let resultsFinishTime = new Date(a_report.get("Time"));
    let refresh = Number(a_report.get("Refresh"));
    // Adds the minutes for next results file on top of the time the current one was finished
    let nextExpectedBuildTime = new Date(Date.parse(resultsFinishTime) + (refresh * 60 * 1000)); // convert refresh to milliseconds

    log("Current Time:             " + a_currentTime.toUTCString());
    log("Time:                     " + resultsFinishTime.toUTCString());
    log("Next Expected Build Time: " + nextExpectedBuildTime.toUTCString());
    if (a_currentTime.getTime() > nextExpectedBuildTime.getTime())
        stale = true;

    return stale;
}
//=============================================================================
