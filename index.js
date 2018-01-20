const save = true;

var websocket       = null;
var users           = {};
var con             = null;
var currentPrice    = 0;
var lastPrice       = 0;
var price           = 0;
var logLength       = 0;
var margin          = 0;
var log             = null;
var mode            = "";
var lastMode        = "";
var key             = "";
var secret          = "";
var passphrase      = "";
var wsURL           = "";
var apiURL          = "";
var product         = "";
var currency        = "";
var dbConnect       = "";

const date          = new Date();
const remote        = process.argv[2];
const Gdax          = require('gdax');
const https         = require('https');
const mysql         = require('mysql');
const uuidv1        = require('uuid/v1');
const fixedArray    = require("fixed-array");
const childProcess  = require('child_process');
var history         = fixedArray(100);

// Setup MySQL
var opt = {
    host: remote,
    path: '/check.php?m=database',
    port: 443,
    method: 'GET'
}
var request = https.request(opt, function (res) {
    var data = '';
    res.on('data', function (chunk) {
        data += chunk;
    });
    res.on('end', function () {
        dbConnect = data.toString().split(",");
        dbConnect[0] = remote;
        con = mysql.createConnection({
            host            : dbConnect[0],
            user            : dbConnect[1],
            password        : dbConnect[2],
            database        : dbConnect[3]
        });
        con.connect(function(err) {
            if (err) throw err;
        });
        /*
        if (save) {
            con.query("DELETE FROM bot", function (err, result) {
                if (err) throw err;
            });
        }
        */
        con.query("SELECT * FROM bot_config", function(err, rows, fields) {
            if (err) throw err;
            margin          = rows[0].margin;
            logLength       = rows[0].points;
            log             = fixedArray(logLength);
            if (rows[0].api == "production") {
                key           = rows[0].key;
                secret        = rows[0].secret;
                passphrase    = rows[0].passphrase;
                wsURL         = rows[0].wsURL;
                apiURL        = rows[0].apiURL;
                product       = rows[0].product;
                currency      = rows[0].currency;
            }else{
                key           = rows[0].sandbox_key;
                secret        = rows[0].sandbox_secret;
                passphrase    = rows[0].sandbox_passphrase;
                wsURL         = rows[0].sandbox_wsURL;
                apiURL        = rows[0].sandbox_apiURL;
                product       = rows[0].sandbox_product;
                currency      = rows[0].sandbox_currency;
            }
            // Now got all config
            setTimeout(startup, 500);
        });
        con.query("SELECT price, action FROM bot_last", function(err, rows, fields) {
            if (err) throw err;
            price = rows[0].price;
            lastMode = rows[0].action;
            if (price) {
                for(var i = 0; i < logLength; i++) {
                    log.push(price);
                }
            }
        });
    });
});
request.end();

function startup() {
    getUsers();
    websocketConnect();
}

function getUsers() {
    opt = {
        host: remote,
        path: "/traders/" + currency,
        port: 443,
        method: 'GET'
    };
    request = https.request(opt, function (res) {
        var data = '';
        res.on('data', function (chunk) {
            data += chunk;
        });
        res.on('end', function () {
            users = JSON.parse(data);
            for (var key in users) {
                console.log(date.toLocaleString() + " User = " + users[key].name);
                users[key].apiURI       = apiURL;
                users[key].product      = product;
                users[key].dbConnect    = dbConnect;
                users[key].key          = key;
            }
            //doDeal('buy', price);
        });
    });
    request.end();
}

function websocketConnect() {
    websocket = new Gdax.WebsocketClient(
        [product],
        wsURL,
        {
            key: key,
            secret: secret,
            passphrase: passphrase
        },
        {
            "type": "subscribe",
            "product_ids": [
                product
            ],
            "channels": [
                "level2",
                {
                    "name": "ticker",
                    "product_ids": [
                        product
                    ]
                },
            ]
        }
    );

    websocket.on('message', data => {
        if (data.type == 'ticker') {
            //console.log(data);
            currentPrice = parseFloat(parseFloat(data.price).toFixed(1));
            if (!price) {
                price = currentPrice;
                for(var i = 0; i < logLength; i++) {
                    log.push(price);
                }
            }
            if (lastPrice != currentPrice) {
                var action = "";
                var value = 0;
                var values = log.values();
                history.push(currentPrice);
                // Are we in a buy or sell mood
                if (currentPrice > (price + margin) && (lastMode == "buy" || !lastMode)) {
                    // Up
                    mode = "sell";
                }else if (currentPrice < (price - margin) && (lastMode == "sell" || !lastMode)) {
                    // Down
                    mode = "buy"
                }else {
                    mode = "";
                }
                if (mode == "buy" && currentPrice > lastPrice) {
                    // we are in Buy mood and price has risen. See if risen for last logLength-1 times + now
                    var go = true;
                    for (var i = 1; i < logLength; i++) {
                        if (values[i-1] >= values[i]) {
                            go = false;
                            break;
                        }
                    }
                    if (go && values[logLength - 1] < currentPrice) {
                        action = "buy";
                        value = parseFloat(data.best_bid);
                    }
                }else if (mode == "sell" && currentPrice < lastPrice) {
                    // we are in Sell mood and price has fallen. See if fallen for last logLength-1 times + now
                    var go = true;
                    for (var i = 1; i < logLength; i++) {
                        if (values[i-1] <= values[i]) {
                            go = false;
                            break;
                        }
                    }
                    if (go && values[logLength - 1] > currentPrice) {
                        action = "sell";
                        value = parseFloat(data.best_bid) - 0.5;
                    }
                }
                if (action) {
                    doDeal(action, value);
                    price = value;
                    lastMode = action;
                }
                if (save) {
                    con.query("INSERT INTO bot (price, mode, value) VALUES (?, ?, ?)", [currentPrice, action, value], function (err, result) {
                        if (err) throw err;
                    });
                }
                lastPrice = currentPrice;
                if (mode) {
                    // Only save to log if within sell or buy
                    log.push(currentPrice);
                }
                if (Object.keys(users).length) {
                    userOrders();
                }
            }
        }
    });
    websocket.on('error', err => { /* handle error */ });
    websocket.on('close', () => {
        console.log(date.toLocaleString() + " " + "Websocket closed");
        process.exit(1); // When running under supervisor, will get restarted
    });
}

function doDeal(action, value) {
    for (var key in users) {
        users[key].action = action;
        users[key].value = value;
        var json = JSON.stringify(users[key]);
        childProcess.fork('userDeal.js', [json]);
    };
    if (save) {
        con.query("UPDATE bot_last SET price = ?, action = ?", [value, action], function (err, result) {
            if (err) throw err;
        });
    }
}

function userOrders() {
    var data = {users: users, dbConnect: dbConnect}
    var json = JSON.stringify(data);
    childProcess.fork('userOrders.js', [json]);
}