require("dotenv").config();

const axios = require("axios").default;
const obtainSignature = require("./utils/Signature").signature;

const headers = {
  "Content-Type": "application/json",
  "X-MBX-APIKEY": process.env.API_KEY,
};

////////////////////////////////////////////////////////////////////////////////////////////////
// Check every trades
exports.checkTrades = async (limit = 500) => {
  const queryString = `timestamp=${Date.now()}&limit=${limit}`;
  const signature = obtainSignature(queryString);
  const response = await axios({
    method: "get",
    url: `${process.env.TESTNET}/fapi/v1/userTrades?${queryString}&signature=${signature}`,
    headers,
  });
  return response?.data;
};

////////////////////////////////////////////////////////////////////////////////////////////////
// Check BTC K-line
exports.checkPrice = async (
  symbol,
  interval,
  limit = 1,
  startTime,
  endTime,
  res
) => {
  const queryString = `symbol=${symbol}&interval=${interval}&limit=${limit}&startTime=${startTime}&endTime=${endTime}`;

  const response = await axios({
    method: "get",
    url: `${process.env.TESTNET}/fapi/v1/klines?${queryString}`,
    headers,
  });

  if (!response) {
    return res.status(400).json({
      status: "error",
      data: "No response from Binance, please try again!",
    });
  }

  return response?.data.reverse().at(0).at(4);
};
