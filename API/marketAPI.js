require("dotenv").config();

const axios = require("axios").default;

const headers = {
  "Content-Type": "application/json",
};

const PRICING_MAP = {
  closing: 4,
  highest: 2,
  lowest: 3,
};

////////////////////////////////////////////////////////////////////////////////////////////////
// Check BTC K-line
exports.checkPrice = async (symbol, interval, limit = 1, type = "closing") => {
  const queryString = `symbol=${symbol}&interval=${interval}&limit=${limit}`;

  const response = await axios({
    method: "get",
    url: `${process.env.TESTNET}/fapi/v1/klines?${queryString}`,
    headers,
  });
  const reverseData = response?.data.reverse();

  if (limit === 1) {
    return +reverseData.at(0).at(PRICING_MAP[type]);
  } else {
    return reverseData.map((el) => +el.at(PRICING_MAP[type]));
  }
};
