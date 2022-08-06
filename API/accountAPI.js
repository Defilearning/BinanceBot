require("dotenv").config();

const axios = require("axios").default;
const obtainSignature = require("../utility").signature;

const timeNow = Date.now() - 1000;

const headers = {
  "Content-Type": "application/json",
  "X-MBX-APIKEY": process.env.API_KEY,
};

////////////////////////////////////////////////////////////////////////////////////////////////
// Check Income History
exports.checkIncome = async () => {
  try {
    const queryString = `timestamp=${timeNow}`;
    const signature = obtainSignature(queryString);
    const response = await axios({
      method: "get",
      url: `${process.env.TESTNET}/fapi/v1/income?${queryString}&signature=${signature}`,
      headers,
    });
    return response.data;
  } catch (err) {
    console.log(err);
  }
};

////////////////////////////////////////////////////////////////////////////////////////////////
// Check future balance
exports.checkFutureBalance = async () => {
  try {
    const queryString = `timestamp=${timeNow}`;
    const signature = obtainSignature(queryString);
    const response = await axios({
      method: "get",
      url: `${process.env.TESTNET}/fapi/v2/balance?${queryString}&signature=${signature}`,
      headers,
    });
    return response.data;
  } catch (err) {
    console.log(err);
  }
};

////////////////////////////////////////////////////////////////////////////////////////////////
// Check Future Position
exports.checkPosition = async (symbol) => {
  try {
    const queryString = `symbol=${symbol}&timestamp=${timeNow}`;
    const signature = obtainSignature(queryString);
    const response = await axios({
      method: "get",
      url: `${process.env.TESTNET}/fapi/v2/positionRisk?${queryString}&signature=${signature}`,
      headers,
    });
    return response.data;
  } catch (err) {
    console.log(err);
  }
};

////////////////////////////////////////////////////////////////////////////////////////////////
// Initial Margin
exports.initialMargin = async (symbol, marginType) => {
  try {
    const queryString = `symbol=${symbol}&marginType=${marginType}&timestamp=${timeNow}`;
    const signature = obtainSignature(queryString);
    const response = await axios({
      method: "post",
      url: `${process.env.TESTNET}/fapi/v1/marginType?${queryString}&signature=${signature}`,
      headers,
    });
    return `Account margin has set to ISOLATED!`;
  } catch (err) {
    return `Account margin has already been set!`;
  }
};

////////////////////////////////////////////////////////////////////////////////////////////////
// Initial Leverage
exports.initialLeverage = async (symbol, leverage) => {
  try {
    const queryString = `symbol=${symbol}&leverage=${leverage}&timestamp=${timeNow}`;
    const signature = obtainSignature(queryString);
    const response = await axios({
      method: "post",
      url: `${process.env.TESTNET}/fapi/v1/leverage?${queryString}&signature=${signature}`,
      headers,
    });
    return `Account leverge has set to ${response.data.leverage}!`;
  } catch (err) {
    return err;
  }
};

////////////////////////////////////////////////////////////////////////////////////////////////
// Open new GTC Order
exports.newOrderLimit = async (symbol, side, timeInForce, quantity, price) => {
  try {
    const queryString = `symbol=${symbol}&side=${side}&type=LIMIT&timeInForce=${timeInForce}&quantity=${quantity}&price=${price}&timestamp=${timeNow}`;
    const signature = obtainSignature(queryString);
    const response = await axios({
      method: "post",
      url: `${process.env.TESTNET}/fapi/v1/order?${queryString}&signature=${signature}`,
      headers,
    });
    return response.data;
  } catch (err) {
    console.log(err);
  }
};

////////////////////////////////////////////////////////////////////////////////////////////////
// Open new Market Order
exports.newOrderMarket = async (symbol, side, quantity) => {
  try {
    const queryString = `symbol=${symbol}&side=${side}&type=MARKET&quantity=${quantity}&timestamp=${timeNow}`;
    const signature = obtainSignature(queryString);
    const response = await axios({
      method: "post",
      url: `${process.env.TESTNET}/fapi/v1/order?${queryString}&signature=${signature}`,
      headers,
    });
    return response.data;
  } catch (err) {
    console.log(err);
  }
};
