const express = require('express');
const request = require('request');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const mongoose = require('mongoose');
const cors = require('cors')

const Response = require('./models/response');

const app = express();
mongoose.Promise = Promise;

app.use(cors())

const myLimit = typeof (process.argv[2]) != 'undefined' ? process.argv[2] : '100kb';
mongoose.connect('mongodb://localhost/response');

app.use(bodyParser.json({
  limit: myLimit,
}));

app.all('*', (req, res) => {

  // Set CORS headers: allow all origins, methods, and headers: you may want to lock this down in a production environment
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, PUT, PATCH, POST, DELETE');
  res.header('Access-Control-Allow-Headers', req.header('access-control-request-headers'));

  if (req.method === 'OPTIONS') {
    // CORS Preflight
    res.send();
  } else {
    const targetURL = req.header('Target-URL');
    const forceUpdate = req.header('Force-update');
    if (!targetURL) {
      res.status(500).send({
        error: 'There is no Target-Endpoint header in the request'
      });
      return;
    }
    const hash = crypto.createHash('md5').update(
      JSON.stringify({
        method: req.method,
        url: targetURL + req.url,
        json: req.body,
      })).digest('hex');

    Response.findOne({
      hash,
    }).exec().then((r) => {
      console.log(r);
      if (!r || forceUpdate) {
        return request({
          url: targetURL + req.url,
          method: req.method,
          json: req.body,
          headers: {
            Authorization: req.header('Authorization'),
          },
        },
        (error, response) => {
          if (error) {
            console.error('error: ' + response.statusCode)
          }
          console.log(forceUpdate, r, 'TOOT');
          if (!r) {
            Response.create({
              hash,
              data: response.body,
            });
          } else {
            console.log('UPFATE')
            r.set({ data: response.body, date: new Date() });
            r.save();
          }
        },
        ).pipe(res);
      } else {
        res.send(r.data);
      }
    }).catch(e => {
      console.log(e);
    });

  }
});

app.set('port', process.env.PORT || 3000);

app.listen(app.get('port'), () => {
  console.log('Proxy server listening on port ' + app.get('port'));
});