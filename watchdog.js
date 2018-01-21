const remote        = process.argv[2];
const mysql         = require('mysql');
const https         = require('https');
const moment        = require('moment')

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
        var dbConnect = data.toString().split(",");
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
        con.query("SELECT MAX(timestamp) AS timestamp FROM bot", function(err, rows, fields) {
            if (err) throw err;
            var last = moment(rows[0].timestamp);
            var now = moment();
            var secondsDiff = now.diff(last, 'seconds');
            if (secondsDiff > 300) { // 5 minutes
                con.query("SELECT pid FROM bot_last", function(err, rows, fields) {
                    if (err) throw err;
                    if (rows[0].pid) {
                        try {
                            process.kill(rows[0].pid);
                        }catch(err) {

                        }
                    }
                    process.exit();
                });
            }else {
                process.exit();
            }
        });
    });
});
request.end();
