//const user    = JSON.parse(process.argv[2]);
const user    = JSON.parse('{"uid":"46","name":"mark","email":"mark@maxdb.com","api_key":" 47d4782eb550cc942fd4d4c03a781ce1","api_secret":"7SmIsjLwz4Tu5PrK2bw7+Q563lDkweoiQYgxQWjyRi3Yr3EU36QcflJ0bTTqlmiDY3h1Qn7i2nOz9C9sFhlC7w==","passphrase":"p1zahucbd6l","currency":"1f67825c-e662-4afc-9885-cac53b871771","trading":false,"pushbullet":null,"euro":"eafc2edf-8298-4062-9241-fd7c304e8856","apiURI":"https://api.gdax.com","amount":0,"product":"ETH-EUR","action":"sell","value":920}');

const Gdax    = require('gdax');
const uuidv1  = require('uuid/v1');
const client  = new Gdax.AuthenticatedClient(user.api_key, user.api_secret, user.passphrase, user.apiURI);

if (user.action == "buy") {
    client
        .cancelOrders()
        .then(data => {
            // Use Euro account
            client
                .getAccount(user.euro)
                .then(data => {
                    var size = 0;
                    if (data.available > 1) {
                        if (user.amount) {
                            size = user.amount / user.value;
                        } else {
                            size = parseFloat(data.available) / user.value
                        }
                        const params = {
                            'side': user.action,
                            'price': user.value,
                            'size': size.toFixed(8),
                            'product_id': user.product,
                            'client_oid': uuidv1()
                        };
                        /*
                        client
                            .buy(params)
                            .then(data => {
                                if (data.message) {
                                    console.log(data.message + " for " + user.name);
                                    return;
                                }
                        })
                        .catch(error => {
                            console.log(error);
                        });
                        */
                        console.log("Buy = " + user.value + ", Size = " + size + " for " + user.name);
                    }
                })
            .catch(error => {
                console.log(error);
            });
        })
        .catch(error => {
            console.log(error);
        });
}else{
    client
        .cancelOrders()
        .then(data => {
        // Use Currency account
            client
                .getAccount(user.currency)
                .then(data => {
                    var size = 0;
                    if (user.amount) {
                        size = user.amount;
                    } else {
                        size = parseFloat(data.available);
                    }
                    const params = {
                        'side': user.action,
                        'price': user.value,
                        'size': size.toFixed(8),
                        'product_id': user.product,
                        'client_oid': uuidv1()
                    };

                    client
                        .sell(params)
                        .then(data => {
                            if (data.message) {
                                console.log(data.message + " for " + user.name);
                                return;
                            }
                    })
                    .catch(error => {
                        console.log(error);
                    });
                    console.log("Sell = " + user.value + ", Size = " + size + " for " + user.name);
            })
            .catch(error => {
                console.log(error);
            });
        })
        .catch(error => {
            console.log(error);
        });
}