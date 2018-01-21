const data    = JSON.parse(process.argv[2]);
//const data      = JSON.parse('{"users":{"8286e9e1-4a65-44b2-a616-7d7a51f3aad9":{"uid":"40","name":"john","email":"john@johnburch.co.uk","api_key":"b20248335aa08863e7807457549ec245","api_secret":"FAFuC9FJxQsIIUx/6pGUjMLSZ3LoyN9zAZVd+PvzMrmL4UtqOtYLfdbQe6WYLgoZNaEKV5B69DjXp9fSFmk/Cw==","passphrase":"ub0prgu3xc9","currency":"ec4ba03a-81e8-4eb6-8c8e-c39729910fd9","trading":{"BTC":{"buy":"200","sell":"10","amount":"1000"},"LTC":{"buy":"200","sell":"45","amount":"1000"},"ETH":{"buy":"790","sell":"10","amount":"1000"}},"pushbullet":"o.bPhmIXgFbJ14X0yd9zoVg6SjNsxpMJvx","euro":"3af7a103-e435-4b7d-bef4-fc17ff93dca4","limit_buy":null,"limit_sell":null,"type":"market","apiURI":"https://api-public.sandbox.gdax.com","product":"BTC-USD","dbConnect":["www.johnburch.co.uk","belocal","extreme9514","johnburch.co.uk"],"key":"8286e9e1-4a65-44b2-a616-7d7a51f3aad9"},"3ca36402-6046-49d1-982a-06cea9f5f129":{"uid":"47","name":"MGame","email":"MGame@unatrac.com","api_key":"d4092dd3ef40229fdfbc3239c6266693","api_secret":"O1E/xiZhJ9vvrZWBxsBgzwFWpD+uX8GaEpCMjO5UTqk48Q2qSHFeJdAvf0M2kqIhKamUcodcOUxxvy8O0oZWGA==","passphrase":"gd959h3tynt","currency":"73c863a5-6f74-465d-a756-21fa38d8efc2","trading":false,"pushbullet":null,"euro":"ea217ca7-830a-44be-a9d6-0eba117ab393","limit_buy":null,"limit_sell":null,"type":"market","apiURI":"https://api-public.sandbox.gdax.com","product":"BTC-USD","dbConnect":["www.johnburch.co.uk","belocal","extreme9514","johnburch.co.uk"],"key":"3ca36402-6046-49d1-982a-06cea9f5f129"}},"dbConnect":["www.johnburch.co.uk","belocal","extreme9514","johnburch.co.uk"]}');
const mysql         = require('mysql');
const childProcess  = require('child_process');

var con = mysql.createConnection({
    host            : data.dbConnect[0],
    user            : data.dbConnect[1],
    password        : data.dbConnect[2],
    database        : data.dbConnect[3]
});
con.connect(function(err) {
    if (err) throw err;
});
con.query("SELECT * FROM bot_orders WHERE fill_price IS NULL", function(err, rows, fields) {
    if (err) throw err;
    for (var i = 0; i < rows.length; i++) {
        var user = data.users[rows[i].profile_id];
        if (user) {
            var params = {user: user, row: rows[i]};
            var json = JSON.stringify(params);
            childProcess.fork('userOrderUpdate.js', [json]);
        }
    }
});
con.end();