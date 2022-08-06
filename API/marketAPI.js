require("dotenv").config();

const axios = require("axios").default;

const headers = {
  "Content-Type": "application/json",
};

////////////////////////////////////////////////////////////////////////////////////////////////
// Check BTC K-line
exports.checkPrice = async (symbol, interval, slice = 1, limit = 500) => {
  try {
    const queryString = `symbol=${symbol}&interval=${interval}&limit=${limit}`;

    const response = await axios({
      method: "get",
      url: `${process.env.TESTNET}/fapi/v1/klines?${queryString}`,
      headers,
    });
    return response.data.reverse().slice(0, slice);
  } catch (err) {
    console.log(err);
  }
};
