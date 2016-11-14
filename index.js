// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

const serialport = require('serialport');
var SerialPort = serialport.SerialPort;

var PDT = null;

var initArduino = 0;
var lastSerialCommand = "";
var lastSerialResponse = "";

var patt = "Arduino";
function initSerial() {
    console.log("Initializing serial port");
    serialport.list(function (err, ports) {
        var outStr = "";
        if (err) { console.log(err); return; };

        outStr = ports.map(function (port) {
            return port.comName
        }).join(", ");

        document.getElementById('port-names').innerHTML = `${outStr}<br/>`;
        if (ports.length !== 0) {
            setupArduino(ports);
        } else {
            console.log("No serial ports found");
        };
    });
}

function setupArduino(availPorts) {

    for (var i = 0; i < availPorts.length; i++) {
        var testStr = availPorts[i].manufacturer.toString();
        if (testStr.search(patt) >= 0) {
            PDT = new SerialPort(availPorts[i].comName, { baudrate: 9600, parser: serialport.parsers.readline('\n') });

        } else {
            console.log("No port found")
            return (-1);
        };
    };

    PDT.on('data', function (data) {
        var outStr = `${data}<br/>`;
        //console.log(`Serial data: ${data} \t Previous data: ${lastSerialResponse}`);
        if (data.trim() == "K" && lastSerialResponse == "P") {
            writeToArduino("V");
            writeToArduino("N");
            writeToArduino("G");
        }
        document.getElementById('serial-output').innerHTML += outStr;
        checkSerialData(data.trim());
        lastSerialResponse = data.trim();
    });
}

function writeToArduino(str) {
    if (PDT.isOpen) {
        setTimeout(() => {
            PDT.write(str, (err) => {
                if (err != null) {
                    console.log(err);
                };
            })
        }, 100);
    }
    lastSerialCommand = str;
}

function sendSerialForm() {
    var serialStr = document.getElementById("serial-command").value;
    writeToArduino(serialStr);
    document.getElementById("serial-command").value = "";
}

function checkSerialData(data) {
    //console.log(data.charAt(0));
    switch (data.charAt(0)) {
        case "K":
            console.log("Timer ready");
            document.getElementById("race-status").innerHTML = "Ready";
            document.getElementById("race-status").className = "ready";
            break;

        case "B":
            console.log("Racing...");
            document.getElementById("race-status").innerHTML = "Racing...";
            document.getElementById("race-status").className = "racing";
            break;

        case "P":
            console.log("Arduino power-up");
            break;

        case ".":
            if (lastSerialCommand == "G") {
                console.log("Gate closed");
                document.getElementById("gate-status").innerHTML = "Gate Closed";
                document.getElementById("gate-status").className = "closed";
            };
            if (/M/.test(lastSerialCommand)) {
                console.log("Masked Lanes done");
            };
            if (lastSerialCommand == "U") {
                console.log("All lanes unmasked");
            };
            break;

        case "O":
            console.log("Gate open.");
            document.getElementById("gate-status").innerHTML = "Gate Open";
            document.getElementById("gate-status").className = "open";
            break;

        case "v":
            console.log("Update timer version");
            if (/vert=(.*)/.test(data)) {
                document.getElementById("get-pdt-version").innerHTML = `PDT V${RegExp.$1}`;
            };
            break;

        case "n":
            console.log("Update number of lanes");
            if (/numl=(\d)/.test(data)) {
                document.getElementById("num-lanes").innerHTML = `${RegExp.$1} Lanes`;
            };
            break;

        case "1":
            console.log("Update time lane 1");
            if (/1 - (\d+\.\d*)/.test(data)) {
                document.getElementById("lane1").innerHTML = RegExp.$1;
            };
            break;
            
        case "2":
            console.log("Update time lane 2");
            if (/2 - (\d+\.\d*)/.test(data)) {
                document.getElementById("lane2").innerHTML = RegExp.$1;
            };
            break;

        case "3":
            console.log("Update time lane 3");
            if (/3 - (\d+\.\d*)/.test(data)) {
                document.getElementById("lane3").innerHTML = RegExp.$1;
            };
            break;
    }
}

function resetArduino() {
    document.getElementById("reset-pdt").className = "clicked";
    writeToArduino("R");
    setTimeout(() => { document.getElementById("reset-pdt").className = "" }, 100);
}