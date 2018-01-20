const data    = JSON.parse(process.argv[2]);
//const params    = JSON.parse('{"user":{"uid":"40","name":"john","email":"john@johnburch.co.uk","api_key":"b20248335aa08863e7807457549ec245","api_secret":"FAFuC9FJxQsIIUx/6pGUjMLSZ3LoyN9zAZVd+PvzMrmL4UtqOtYLfdbQe6WYLgoZNaEKV5B69DjXp9fSFmk/Cw==","passphrase":"ub0prgu3xc9","currency":"ec4ba03a-81e8-4eb6-8c8e-c39729910fd9","trading":{"BTC":{"buy":"200","sell":"10","amount":"1000"},"LTC":{"buy":"200","sell":"45","amount":"1000"},"ETH":{"buy":"790","sell":"10","amount":"1000"}},"pushbullet":"o.bPhmIXgFbJ14X0yd9zoVg6SjNsxpMJvx","euro":"3af7a103-e435-4b7d-bef4-fc17ff93dca4","limit_buy":null,"limit_sell":null,"type":"market","apiURI":"https://api-public.sandbox.gdax.com","product":"BTC-USD","dbConnect":["www.johnburch.co.uk","belocal","extreme9514","johnburch.co.uk"],"key":"8286e9e1-4a65-44b2-a616-7d7a51f3aad9"},"row":{"id":2,"timestamp":"2018-01-20T15:17:36.000Z","side":"sell","uid":40,"profile_id":"8286e9e1-4a65-44b2-a616-7d7a51f3aad9","order_id":"4df532fb-3ee5-446f-8442-3b14b8c2e3a4","ask_price":910.16,"fill_price":null,"fill_fee":null,"order_data":"{\\"id\\":\\"4df532fb-3ee5-446f-8442-3b14b8c2e3a4\\",\\"size\\":\\"217.15988012\\",\\"product_id\\":\\"BTC-USD\\",\\"side\\":\\"sell\\",\\"stp\\":\\"dc\\",\\"type\\":\\"market\\",\\"post_only\\":false,\\"created_at\\":\\"2018-01-20T15:17:21.202859Z\\",\\"fill_fees\\":\\"0.0000000000000000\\",\\"filled_size\\":\\"0.00000000\\",\\"executed_value\\":\\"0.0000000000000000\\",\\"status\\":\\"pending\\",\\"settled\\":false}","fill_data":null}}');
const Gdax      = require('gdax');
const mysql     = require('mysql');
const client    = new Gdax.AuthenticatedClient(params.user.api_key, params.user.api_secret, params.user.passphrase, params.user.apiURI);

const con = mysql.createConnection({
    host            : params.user.dbConnect[0],
    user            : params.user.dbConnect[1],
    password        : params.user.dbConnect[2],
    database        : params.user.dbConnect[3]
});
con.connect(function(err) {
    if (err) throw err;
});
client
    .getOrder(params.row.order_id)
    .then(data => {
        if (data.settled) {
            con.query("UPDATE bot_orders SET fill_price = ?, fill_fee = ?, fill_data = ? WHERE id = ?", [data.executed_value, data.fill_fees, JSON.stringify(data), params.row.id]);
            con.end();
        }
})
.catch(error => {
    console.log(date.toLocaleString() + " " + error);
});
