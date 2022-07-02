require("dotenv").config();

const CryptoJS = require("crypto-js");
const axios = require("axios").default;
// const technicalindicators = require("technicalindicators");
// technicalindicators.setConfig("precision", 10);
// const EMA = technicalindicators.EMA;
const EMA = require("technicalindicators").EMA;

let klineData = [];
let closingPriceArr = [];
let prevEMA7;
let prevEMA25;

////////////////////////////////////////////////////////////////////////////////////////////////
// Check future balance
const checkFutureBalance = async () => {
  try {
    const timeStamp = Date.now();
    const queryString = `timestamp=${timeStamp}`;
    const signature = CryptoJS.HmacSHA256(
      queryString,
      process.env.API_SECRET
    ).toString();

    const response = await axios.get(
      `${process.env.TESTNET}/fapi/v2/balance?timestamp=${timeStamp}&signature=${signature}`,
      {
        headers: {
          "Content-Type": "application/json",
          "X-MBX-APIKEY": process.env.API_KEY,
        },
      }
    );

    const USDTBalance = response.data.find((el) => el.asset === "USDT");
    console.log(USDTBalance);
  } catch (err) {
    console.log(err);
  }
};

////////////////////////////////////////////////////////////////////////////////////////////////
// Open new Order
const newOrder = async (symbol, side, type, timeInForce, quantity, price) => {
  try {
    const timeStamp = Date.now();
    const queryString = `symbol=${symbol}&side=${side}&type=${type}&timeInForce=${timeInForce}&quantity=${quantity}&price=${price}&timestamp=${timeStamp}`;

    const signature = CryptoJS.HmacSHA256(
      queryString,
      process.env.API_SECRET
    ).toString();

    const response = await axios({
      method: "post",
      url: `${process.env.TESTNET}/fapi/v1/order?${queryString}&signature=${signature}`,
      headers: {
        "Content-Type": "application/json",
        "X-MBX-APIKEY": process.env.API_KEY,
      },
    });

    console.log(response.data);
  } catch (err) {
    console.log(err);
  }
};

////////////////////////////////////////////////////////////////////////////////////////////////
// Check BTC K-line
const checkPrice = async (symbol, interval) => {
  try {
    const queryString = `symbol=${symbol}&interval=${interval}`;

    const response = await axios({
      method: "get",
      url: `${process.env.TESTNET}/fapi/v1/klines?${queryString}`,
      headers: {
        "Content-Type": "application/json",
      },
    });

    klineData = [...response.data];
    klineData = klineData.reverse().slice(0, 61);

    closingPriceArr = klineData.map((el) => +el[4]);
    // console.log(closingPriceArr);
    ////////////////////////////////////////////////////////////////////////////////////////////////
    // EMA formula
    const calculatedEMA7 = EMA.calculate({
      period: 7,
      values: closingPriceArr,
      reversedInput: true,
    });
    const calculatedEMA25 = EMA.calculate({
      period: 26,
      values: closingPriceArr,
      reversedInput: true,
    });

    console.log(calculatedEMA25);
  } catch (err) {
    console.log(err);
  }
};

////////////////////////////////////////////////////////////////////////////////////////////////
// Init apps
// setInterval(() => {
// checkFutureBalance();
// newOrder("BTCUSDT", "BUY", "LIMIT", "GTC", 0.01, 18000);
checkPrice("BTCUSDT", "30m");
// }, 1000);
