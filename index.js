// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

const serialport = require('serialport');
var SerialPort = serialport.SerialPort;

var PDT = null;

var lastSerialCommand = "";
var lastSerialResponse = "";
var laneMask = [];
var laneTimes = [];

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
        var serialDiv = document.getElementById('serial-output');
        serialDiv.innerHTML += outStr;
        serialDiv.scrollTop = serialDiv.scrollHeight;
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
            clearDisplay();
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
            if (/M(\d)/.test(lastSerialCommand)) {
                var maskedLane = RegExp.$1;
                laneMask[maskedLane - 1] = 1;
                updateLaneDisplay();
                console.log(`Masked Lanes done: ${laneMask}`);
            };
            if (lastSerialCommand == "U") {
                if (laneMask.length != 0) {
                    for (var i = 0; i < laneMask.length; i++) {
                        laneMask[i] = 0;
                    };
                };
                updateLaneDisplay();
                console.log(`All lanes unmasked: ${laneMask}`);
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
            var numLanes;
            if (/numl=(\d)/.test(data)) {
                numLanes = RegExp.$1;
                document.getElementById("num-lanes").innerHTML = `${numLanes} Lanes`;
            };
            //setup lane mask variable for # of lanes but only if not done already
            //console.log(`laneMask is ${laneMask} and length is ${laneMask.length}`);
            if (laneMask.length == "0") {
                console.log("Initializing laneMask variable")
                for (var i = 0; i < numLanes; i++) {
                    laneMask[i] = 0;
                };
            };
            break;

        default:
            var testRegEx = /(\d) - (\d+\.\d*)/.test(data);
            if (testRegEx) {
                var tempLaneNum = RegExp.$1;
                var tempLaneTime = RegExp.$2;
                if (laneMask[tempLaneNum - 1] != 1) {
                    console.log(`Update lane ${tempLaneNum} with time ${tempLaneTime}`);
                    document.getElementById(`lane${tempLaneNum}`).innerHTML = tempLaneTime;
                };
            };
            break;
    }
}

function resetArduino() {
    document.getElementById("reset-pdt").className = "clicked";
    writeToArduino("R");
    setTimeout(() => { 
        document.getElementById("reset-pdt").className = ""; 
        clearDisplay(); 
    }, 100);
}

function updateLaneDisplay() {
    for (var i = 0; i < laneMask.length; i++) {
        var tempLaneId = "lane" + (i+1) + "Li";
        console.log(`temp lane Id: ${tempLaneId}`);
        switch (laneMask[i]) {
            case 1:
                document.getElementById(tempLaneId).style = "visibility: hidden;";
                console.log(`Hiding lane ${i}.`);
                break;
            case 0:
                document.getElementById(tempLaneId).style = "visibility: visible;";
                break;
        };
    }
}

function clearDisplay() {
    var tempDisplay = document.getElementsByClassName("LEDdisplay");
    console.log("LED Display Elements:")
    console.log(tempDisplay);
    for (var i = 0; i < tempDisplay.length; i++){
        tempDisplay[i].innerHTML = "0.0000";
    };
}