require("dotenv").config();
const CryptoJS = require("crypto-js");

exports.signature = (query) => {
  const queryString = query;
  return CryptoJS.HmacSHA256(queryString, process.env.API_SECRET).toString();
};
