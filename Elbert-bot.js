const accountAPI = require("./API/accountAPI");
const marketAPI = require("./API/marketAPI");
const TA = require("./technical_Indicator");

///////////////////////////////////////////////////////////////////////////////////////////////
// Init setting for 1st time
let targetProfit = 0.013;
let stopLoss = -0.01;
let accountFiat = "USDT";
let accountMargin = "ISOLATED";
let accountLeverage = 5;
let tradePair = "BTCUSDT";
let positionPlaced;
let accountPercentage = 1;

let positionIntervalSec = 1;
let OrderIntervalMin = 0.0167;
let loopStopLossPrice, loopTargetProfitPrice;

/*
accountAPI
  .initialMargin(tradePair, accountMargin)
  .then((data) => console.log(data));
accountAPI
  .initialLeverage(tradePair, accountLeverage)
  .then((data) => console.log(data));
*/

////////////////////////////////////////////////////////////////////////////////////////////////
// Init apps
const init = async () => {
  try {
    // 1)Set up Account Balance, preEMA and Position Balance (if available)
    let interval;

    // Check account balance
    /*
    let accountAvailableBalance = +(await accountAPI.checkFutureBalance()).find(
      (el) => el.asset === accountFiat
    ).availableBalance;
    console.log(`Account ${accountFiat}: ${accountAvailableBalance}`);

    if (accountAvailableBalance < 11) {
      console.log(`Account not available balance, Please top up!`);
      return;
    }

    // To calculate next order amount
    let nextOrderPrice =
      accountAvailableBalance * accountPercentage > 11
        ? accountAvailableBalance * accountPercentage
        : 11;
*/

    //////////////////////////////////////////////////////////////////////////////
    // IF THERE IS NO POSITION
    //TODO: 1st criteria - 1d EMA 200
    const closingPrice1d = (
      await marketAPI.checkPrice(tradePair, "1d", 485)
    ).map((el) => +el[4]);

    let currentClosingPrice = closingPrice1d[0];
    let currentEMA1d = TA.calculateEMA(200, closingPrice1d)[0];

    //TODO: 2nd criteria - 1m EMA240
    const closingPrice1m = (
      await marketAPI.checkPrice(tradePair, "1m", 470, 600)
    ).map((el) => +el[4]);
    let currentEMA1m = TA.calculateEMA(240, closingPrice1m)[0];

    //TODO: 3rd criteria - 1m RSI
    let currentRSI1m = TA.calculateRSI(14, closingPrice1m);
    console.log(currentRSI1m[0]);

    //TODO: to match 1st and 2nd criteria:
    //Above 1d & 1m EMA
    if (
      currentClosingPrice > currentEMA1d &&
      currentClosingPrice > currentEMA1m &&
      currentClosingPrice > currentEMA1d * 1.005 &&
      currentRSI1m < 30
    ) {
      console.log(`to enter LOGNG position`);
    }

    //Below 1d & 1m EMA
    if (
      currentClosingPrice < currentEMA1d &&
      currentClosingPrice < currentEMA1m &&
      currentClosingPrice < currentEMA1d * 0.995 &&
      currentRSI1m > 70
    ) {
      console.log(`to enter SHORT position`);
      for (i = 1; i < 8; i++) {
        const loopCheckPrice1m = await marketAPI.checkPrice(
          tradePair,
          "1m",
          20
        );

        const loopClosingPrice1m = loopCheckPrice1m.map((el) => +el[4]);
        let loopCurrentEMA1m = TA.calculateEMA(9, loopClosingPrice1m)[0];

        // to set highest price(stop loss price)
        const loopHighestPrice1m = loopCheckPrice1m.slice(0, 1)[2];
        // to check if closing price below EMA9, if Yes, open SHORT order

        console.log(`this is ${i} runtime`);
      }
    }

    //////////////////////////////////////////////////////////////////////////////
  } catch (err) {
    console.log(err);
    // console.log(`--System down, restarting:--`);
    // return init();
  }
};

init();
