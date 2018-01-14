var users           = {};
var con             = null;
var websocket       = null;
var currentPrice    = 0;
var lastPrice       = 0;
var price           = 0;
var fixedArray      = require("fixed-array");
var log             = fixedArray(2);
var mode            = "";
var lastMode        = "";

const margin        = 2;
const amount        = 0;
const remote        = "www.johnburch.co.uk";
const api           = "production";
const Gdax          = require('gdax');
const https         = require('https');
const mysql         = require('mysql');
const uuidv1        = require('uuid/v1');

if (api == "production") {
    var key           = '58d1428c5ccf65277a31c857d5279b62';
    var secret        = 'q6jCM+x7NELTe2IVZXcEfqTPEv8fyL8Qs+Mo9OvpStWpkcpQ/Rt1XQ4uwDqKYNlbgPuWr/1phlIUDmrTCZpMJw==';
    var passphrase    = 'krmk29adak';
    var wsURL         = 'wss://ws-feed.gdax.com';
    var apiURL        = 'https://api.gdax.com'
    var product       = "ETH-EUR";
    var currency      = "ETH";
}else{
    var key           = 'b20248335aa08863e7807457549ec245';
    var secret        = 'FAFuC9FJxQsIIUx/6pGUjMLSZ3LoyN9zAZVd+PvzMrmL4UtqOtYLfdbQe6WYLgoZNaEKV5B69DjXp9fSFmk/Cw==';
    var passphrase    = 'ub0prgu3xc9';
    var wsURL         = 'wss://ws-feed-public.sandbox.gdax.com';
    var apiURL        = 'https://api-public.sandbox.gdax.com'
    var product       = "BTC-USD";
    var currency      = "BTC";
}

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
        var arr = data.toString().split(",");
        con = mysql.createConnection({
            host            : remote,
            user            : arr[1],
            password        : arr[2],
            database        : arr[3]
        });
        con.connect(function(err) {
            if (err) throw err;
        });

        con.query("DELETE FROM bot", function (err, result) {
            if (err) throw err;
        });

    });
});
request.end();

// Get users
opt = {
    host: remote,
    path: "/traders/" + currency + "?XDEBUG_SESSION_START=john",
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
            users[key].client = new Gdax.AuthenticatedClient(users[key].api_key, users[key].api_secret, users[key].passphrase, apiURL);
        }
        doDeal('buy', 980);
    });
});
request.end();

websocketConnect();

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
}

websocket.on('message', data => {
    if (data.type == 'ticker') {
        //console.log(data);
        currentPrice = parseFloat(data.price).toFixed(1);
        if (!price) {
            price = currentPrice;
        }
        if (lastPrice != currentPrice) {
            var action = "";
            var value = "";
            if (log.length() == 2) {
                var values = log.values();
                if (currentPrice > price + margin && (lastMode == "buy" || !lastMode) && (values[0] > values[1] && values[1] > currentPrice)) {
                    action = "buy";
                    value = parseFloat(data.best_bid) + 0.1;
                }else if (currentPrice < price - margin && (lastMode == "sell" || !lastMode) && (values[0] < values[1] && values[1] < currentPrice)) {
                    action = "sell";
                    value = parseFloat(data.best_bid) - 0.1;
                }
                if (action) {
                    doDeal(action, value);
                    price = value;
                    lastMode = action;
                }
            }
            con.query("INSERT INTO bot (price, mode, value) VALUES (?, ?, ?)", [currentPrice, action, value], function (err, result) {
                if (err) throw err;
            });
            lastPrice = currentPrice;
            log.push(currentPrice);
        }
    }
});
websocket.on('error', err => { /* handle error */ });
websocket.on('close', () => { websocketConnect() });

function doDeal(action, value) {
    for (var key in users) {
        doUserDeal(users[key], action, value)
    };
}

function doUserDeal(user, action, value) {
    if (action == "buy") {
        // Get Euro account
        user.client.getAccount(user.euro_id).then(data => {
            var user = users[data.profile_id];
            var size = 0;
            if (data.available > 1) {
                if (amount) {
                    size = amount / value;
                }else{
                    size = data.available / value
                }
                const params = {
                    'side': action,
                    'price': value, // USD
                    'size': size, // LTC
                    'product_id': product,
                    'post_only': true,
                    'time_in_force': 'IOC',
                    'client_oid': uuidv1()
                };
                var a=1;
            }
        })
        .catch(error => {
                var a=1;
        });
    }else{
        // Get Currency account
        user.client.getAccount(user.currency_id).then(data => {
            var user = users[data.profile_id];
            var size = 0;
            if (data.available > 1) {
                if (amount) {
                    size = amount;
                }else{
                    size = data.available
                }
                const params = {
                    'side': action,
                    'price': value, // USD
                    'size': size, // LTC
                    'product_id': product,
                    'post_only': true,
                    'time_in_force': 'IOC'
                };
                var a=1;
            }
        })
        .catch(error => {
                var a=1;
        });
    }





}
