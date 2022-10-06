const accountAPI = require("../API/accountAPI");
const marketAPI = require("../API/marketAPI");
const TA = require("../technical_Indicator");

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

accountAPI
  .initialMargin(tradePair, accountMargin)
  .then((data) => console.log(data));
accountAPI
  .initialLeverage(tradePair, accountLeverage)
  .then((data) => console.log(data));

////////////////////////////////////////////////////////////////////////////////////////////////
// Init apps
const init = async () => {
  try {
    // 1)Set up Account Balance, preEMA and Position Balance (if available)
    let interval;

    // Check account balance
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

    // To set up current position price and current position quantity
    const position = (await accountAPI.checkPosition(tradePair))[0];
    let positionAmt = +position.positionAmt;
    let positionPrice = +position.entryPrice;
    positionPlaced = Math.abs(positionAmt);

    //////////////////////////////////////////////////////////////////////////////
    // 2) If there is position
    if (positionAmt !== 0) {
      clearInterval(interval);
      interval = setInterval(async () => {
        // If position is short
        if (position.positionAmt.startsWith("-")) {
          const currentPriceArr = (
            await marketAPI.checkPrice(tradePair, "15m")
          )[0];
          const currentPrice = +currentPriceArr[4];
          console.log(currentPrice);

          // If profit >= 1%, open order to close the position, reset Account Balance and Position Balance
          if ((positionPrice - currentPrice) / currentPrice >= targetProfit) {
            accountAPI
              .newOrderMarket(tradePair, "BUY", positionPlaced)
              .then(() => {
                console.log(
                  `Profit earned: ${
                    (positionPrice - currentPrice) * positionPlaced
                  }`
                );
                positionPrice = positionAmt = 0;
                clearInterval(interval);
                return init();
              });
          }
          if ((positionPrice - currentPrice) / currentPrice <= stopLoss) {
            accountAPI
              .newOrderMarket(tradePair, "BUY", positionPlaced)
              .then(() => {
                console.log(
                  `Loss for: ${(positionPrice - currentPrice) * positionPlaced}`
                );
                positionPrice = positionAmt = 0;
                clearInterval(interval);
                return init();
              });
          }
        }

        // If position is long
        if (positionAmt > 0) {
          const currentPriceArr = (
            await marketAPI.checkPrice(tradePair, "15m")
          )[0];
          const currentPrice = +currentPriceArr[4];
          console.log(currentPrice);

          // If profit >= 1%, open order to close the position, reset Account Balance and Position Balance
          if ((currentPrice - positionPrice) / positionPrice >= targetProfit) {
            accountAPI
              .newOrderMarket(tradePair, "SELL", positionPlaced)
              .then(() => {
                console.log(
                  `Profit earned: ${
                    (currentPrice - positionPrice) * positionPlaced
                  }`
                );
                positionPrice = positionAmt = 0;
                clearInterval(interval);
                return init();
              });
          }
          if ((currentPrice - positionPrice) / positionPrice <= stopLoss) {
            accountAPI
              .newOrderMarket(tradePair, "SELL", positionPlaced)
              .then(() => {
                console.log(
                  `Loss for: ${(currentPrice - positionPrice) * positionPlaced}`
                );
                positionPrice = positionAmt = 0;
                clearInterval(interval);
                return init();
              });
          }
        }
      }, positionIntervalSec * 1000);
    }

    /////////////////////////////////////////////////////////////////////////////
    // 3) If there is no position
    if (positionAmt === 0) {
      clearInterval(interval);
      interval = setInterval(async () => {
        // Obatin closing price
        const closingPrice = (
          await marketAPI.checkPrice(tradePair, "15m", 61)
        ).map((el) => +el[4]);

        //To get order quantity
        let orderQuantity = (nextOrderPrice / closingPrice[0]).toFixed(3);

        // Check prevEMA
        let prevEMA7 = TA.calculateEMA(7, closingPrice)[1];
        let prevEMA25 = TA.calculateEMA(25, closingPrice)[1];
        let prevNetEMA = prevEMA7 - prevEMA25;

        // Check currentEMA
        let currentEMA7 = TA.calculateEMA(7, closingPrice)[0];
        let currentEMA25 = TA.calculateEMA(25, closingPrice)[0];
        let currentNetEMA = currentEMA7 - currentEMA25;

        // If prevEMA is -ve and currentEMA is +ve
        if (Math.sign(prevNetEMA) === -1 && Math.sign(currentNetEMA) === 1) {
          accountAPI
            .newOrderMarket(tradePair, "BUY", orderQuantity)
            .then(() => {
              console.log(
                `Position placed: LONG ${orderQuantity} ${tradePair}`
              );
              clearInterval(interval);
              return init();
            });
        }

        // If prevEMA is +ve and currentEMA is -ve
        if (Math.sign(prevNetEMA) === 1 && Math.sign(currentNetEMA) === -1) {
          accountAPI
            .newOrderMarket(tradePair, "SELL", orderQuantity)
            .then(() => {
              console.log(
                `Position placed: SHORT ${orderQuantity} ${tradePair}`
              );
              clearInterval(interval);
              return init();
            });
        }

        console.log(`No EMA crossing found as at ${Date()}`);
      }, OrderIntervalMin * 1000 * 60);
    }
  } catch (err) {
    console.log(`--System down, restarting:--`);
    return init();
  }
};

init();
