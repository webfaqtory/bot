const user    = JSON.parse(process.argv[2]);
//const user    = JSON.parse('{"uid":"40","name":"john","email":"john@johnburch.co.uk","api_key":"b20248335aa08863e7807457549ec245","api_secret":"FAFuC9FJxQsIIUx/6pGUjMLSZ3LoyN9zAZVd+PvzMrmL4UtqOtYLfdbQe6WYLgoZNaEKV5B69DjXp9fSFmk/Cw==","passphrase":"ub0prgu3xc9","currency":"ec4ba03a-81e8-4eb6-8c8e-c39729910fd9","trading":{"BTC":{"buy":"200","sell":"10","amount":"1000"},"LTC":{"buy":"200","sell":"45","amount":"1000"},"ETH":{"buy":"790","sell":"10","amount":"1000"}},"pushbullet":"o.bPhmIXgFbJ14X0yd9zoVg6SjNsxpMJvx","euro":"3af7a103-e435-4b7d-bef4-fc17ff93dca4","limit_buy":null,"limit_sell":null,"type":"market","apiURI":"https://api-public.sandbox.gdax.com","product":"BTC-USD","dbConnect":["www.johnburch.co.uk","belocal","extreme9514","johnburch.co.uk"],"key":"8286e9e1-4a65-44b2-a616-7d7a51f3aad9","action":"sell","value":910.16}');

const Gdax      = require('gdax');
const uuidv1    = require('uuid/v1');
const mysql     = require('mysql');
const client    = new Gdax.AuthenticatedClient(user.api_key, user.api_secret, user.passphrase, user.apiURI);
const date      = new Date();
var params      = {};
var size        = 0;

if (user.action == "buy") {
    if (user.type == 'market') {
        doBuy()
    }else {
        client
            .cancelOrders()
            .then(data => {
                doBuy();
            })
            .catch(error => {
                console.log(date.toLocaleString() + " " + error);
            });
    }
}else{
    if (user.type == 'market') {
        doSell();
    }else {
        client
            .cancelOrders()
            .then(data => {
                doSell();
            })
            .catch(error => {
                console.log(date.toLocaleString() + " " + error);
            });
    }
}

function doBuy() {
    // Use Euro account
    client
        .getAccount(user.euro)
        .then(data => {
            if (data.available > 1) {
                if (user.limit_buy && user.limit_buy <= data.available) {
                    data.available = parseFloat(user.limit_buy);
                }else {
                    data.available = parseFloat(data.available);
                }
                if (user.type == 'market') {
                    params = {
                        'type': 'market',
                        'side': user.action,
                        'funds': data.available.toFixed(8),
                        'product_id': user.product,
                        'client_oid': uuidv1()
                    };
                }else {
                    var fee = data.available * (0.3 / 100);
                    data.available = data.available - fee;
                    size = data.available / user.value;
                    params = {
                        'side': user.action,
                        'price': user.value,
                        'size': size.toFixed(8),
                        'product_id': user.product,
                        'client_oid': uuidv1()
                    };
                }
                client
                    .buy(params)
                    .then(data => {
                        if (data.message) {
                            console.log(date.toLocaleString() + " " + data.message + " for " + user.name);
                            return;
                        }else{
                            saveOrder(data);
                        }
                })
                .catch(error => {
                        console.log(date.toLocaleString() + " " + error);
                });
                console.log(date.toLocaleString() + " " + "Buy = " + user.value + ", Size = " + size + " for " + user.name);
        }
    })
    .catch(error => {
            console.log(date.toLocaleString() + " " + error);
    });
}

function doSell() {
    // Use Currency account
    client
        .getAccount(user.currency)
        .then(data => {
            if (user.type == 'market') {
                size = parseFloat(data.available).toFixed(8);
                params = {
                    'type': 'market',
                    'side': user.action,
                    'size': size,
                    'product_id': user.product,
                    'client_oid': uuidv1()
                };
            }else {
                var fee = parseFloat(data.available) * (0.3 / 100);
                data.available = parseFloat(data.available) - fee;
                size = data.available / user.value;
                params = {
                    'side': user.action,
                    'price': user.value,
                    'size': size.toFixed(8),
                    'product_id': user.product,
                    'client_oid': uuidv1()
                };
            }

            client
                .sell(params)
                .then(data => {
                if (data.message) {
                    console.log(date.toLocaleString() + " " + data.message + " for " + user.name);
                    return;
                }else{
                    saveOrder(data);
                }
            })
            .catch(error => {
                    console.log(date.toLocaleString() + " " + error);
            });
            console.log("Sell = " + user.value + ", Size = " + size + " for " + user.name);
    })
    .catch(error => {
            console.log(date.toLocaleString() + " " + error);
    });
}

function saveOrder(data) {
    var con = mysql.createConnection({
        host            : user.dbConnect[0],
        user            : user.dbConnect[1],
        password        : user.dbConnect[2],
        database        : user.dbConnect[3]
    });
    con.connect(function(err) {
        if (err) throw err;
    });
    con.query("INSERT INTO bot_orders (side, profile_id, uid, order_id, ask_price, order_data) VALUES (?, ?, ?, ?, ?, ?)", [data.side, user.key, parseInt(user.uid), data.id, parseFloat(user.value), JSON.stringify(data)], function (err, result) {
        if (err) throw err;
    });
    con.end();
}