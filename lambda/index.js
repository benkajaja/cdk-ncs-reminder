const request = require('request');
const peurl = "https://pe.ntu.edu.tw/api/rent/yearuserrent";
const requestyearUserUnitName = ['資訊工程學系', '資工所', '網媒所'];
const requestvenueId = ['86', '87', '88', '89'];
const now = new Date();
const rentDateS = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 1)).toISOString().substr(0, 10); //yyyy-MM-dd
const rentDateE = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 2, 0)).toISOString().substr(0, 10); //yyyy-MM-dd

exports.handler = async function (event) {
  let secretname = process.env.SECRETNAME || "secretsForTG"
  let secret = await mySecrets(secretname);
  let secretobj = JSON.parse(secret);
  let CHANNEL;
  const ENVMOD = process.env.ENVMOD || "DEV";
  switch (ENVMOD){
    case "PROD":
      console.log("[DEBUG] PRODMOD");
      CHANNEL = secretobj.PRODCHANNEL;
      break;
    case "DEV":
      console.log("[DEBUG] DEVMOD");
      CHANNEL = secretobj.DEVCHANNEL;
      break;
    default:
      console.log("[DEBUG] DEVMOD");
      CHANNEL = secretobj.DEVCHANNEL;
  }
  const TOKEN = secretobj.TOKEN;
  const tgurl = `https://api.telegram.org/bot${TOKEN}/sendMessage`;

  console.log(now);
  console.log(rentDateS);
  console.log(rentDateE);

  for (let i = 0; i < requestvenueId.length; i++) {
    let d = await crawl(requestvenueId[i]);
    let res = checkSticksInData(d);
    if (res) {
      console.log("Pass check.");
      return;
    }
  }
  console.log("Check failed. Send reminder message!");
  let tgmsg = await sendReminderMessage(tgurl, CHANNEL);
  console.log(tgmsg);
};

async function crawl(court) {
  let key = { 'rentDateS': rentDateS, 'rentDateE': rentDateE, 'venueId': court };
  return new Promise((resolve, reject) => {
    request({
      url: peurl,
      method: "GET",
      qs: key,
    }, function (err, res, body) {
      if (err) {
        return reject(err);
      } else if (res.statusCode !== 200) {
        err = new Error("Unexpected status code: " + res.statusCode);
        err.res = res;
        return reject(err);
      }
      resolve(body);
    });
  });
}

function checkSticksInData(data) {
  let res = false;
  let s = requestyearUserUnitName;
  for (let i = 0; i < s.length; i++) {
    res = res || data.includes(s[i]);
    if (res) { return res }
  }
  return res;
}

async function sendReminderMessage(tgurl, channel) {
  return new Promise((resolve, reject) => {
    request({
      url: tgurl,
      method: "POST",
      json: { "chat_id": channel, "text": `[Note] ${rentDateS.substr(0, 7)}尚未放籤;(` }
    }, function (err, res, body) {
      if (err) {
        return reject(err);
      } else if (res.statusCode !== 200) {
        err = new Error("Unexpected status code: " + res.statusCode);
        err.res = res;
        return reject(err);
      }
      resolve(body);
    });
  });
}

async function mySecrets(secretName) {
  // Load the AWS SDK
  var AWS = require('aws-sdk'),
    region = process.env.AWS_REGION,
    secretName = secretName,
    secret,
    decodedBinarySecret;

  // Create a Secrets Manager client
  var client = new AWS.SecretsManager({
    region: region
  });

  return new Promise((resolve, reject) => {
    client.getSecretValue({ SecretId: secretName }, function (err, data) {

      // In this sample we only handle the specific exceptions for the 'GetSecretValue' API.
      // See https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_GetSecretValue.html
      // We rethrow the exception by default.
      if (err) {
        reject(err);
      }
      else {
        // Decrypts secret using the associated KMS CMK.
        // Depending on whether the secret is a string or binary, one of these fields will be populated.
        if ('SecretString' in data) {
          resolve(data.SecretString);
        } else {
          let buff = new Buffer(data.SecretBinary, 'base64');
          resolve(buff.toString('ascii'));
        }
      }
    });
  });
}