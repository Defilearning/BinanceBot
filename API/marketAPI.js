require("dotenv").config();

const axios = require("axios").default;

const headers = {
  "Content-Type": "application/json",
};

////////////////////////////////////////////////////////////////////////////////////////////////
// Check BTC K-line
exports.checkPrice = async (symbol, interval, limit = 8000) => {
  try {
    const queryString = `symbol=${symbol}&interval=${interval}&limit=${limit}`;

    const response = await axios({
      method: "get",
      url: `${process.env.TESTNET}/fapi/v1/klines?${queryString}`,
      headers,
    });
    return response.data.reverse();
  } catch (err) {
    if (err.response) {
      if (err.response.data) {
        if (err.response.data.msg) {
          throw new Error(err.response.data.msg);
        }
        throw new Error(err.response.data);
      }
      throw new Error(err.response);
    }
    throw new Error(err);
  }
};
