const accountAPI = require("./API/accountAPI");
const marketAPI = require("./API/marketAPI");
const TA = require("./technical_Indicator");

///////////////////////////////////////////////////////////////////////////////////////////////
// Init setting for 1st time
let targetProfit = 0.01;
let stopLoss = -0.007;
let accountMargin = "ISOLATED";
let accountLeverage = 5;
let tradePair = "BTCUSDT";
let positionPlaced = 0.01;

accountAPI
  .initialMargin(tradePair, accountMargin)
  .then((data) => console.log(data));
accountAPI
  .initialLeverage(tradePair, accountLeverage)
  .then((data) => console.log(data));

////////////////////////////////////////////////////////////////////////////////////////////////
// Init apps
const init = async () => {
  // 1)Set up Account Balance, preEMA and Position Balance (if available)
  let interval;

  let accountAvailableBalance = +(await accountAPI.checkFutureBalance()).find(
    (el) => el.asset === "USDT"
  ).availableBalance;
  console.log(`Account USDT: ${accountAvailableBalance}`);

  const closingPrice = (await marketAPI.checkPrice(tradePair, "30m", 61)).map(
    (el) => +el[4]
  );
  let prevEMA7 = TA.calculateEMA(7, closingPrice)[1];
  let prevEMA25 = TA.calculateEMA(25, closingPrice)[1];
  let prevNetEMA = prevEMA7 - prevEMA25;
  console.log(
    `PrevEMA7:${prevEMA7}\nPrevEMA25:${prevEMA25}\nPrevNetEMA=${prevNetEMA}`
  );

  const position = (await accountAPI.checkPosition(tradePair))[0];
  let positionAmt = +position.positionAmt;
  let positionPrice = +position.entryPrice;
  console.log(positionPrice, positionAmt);

  // 2) If there is position
  if (positionAmt !== 0) {
    clearInterval(interval);
    interval = setInterval(async () => {
      // If position is short
      if (position.positionAmt.startsWith("-")) {
        const currentPriceArr = (
          await marketAPI.checkPrice(tradePair, "30m")
        )[0];
        const currentPrice = +currentPriceArr[4];
        console.log(currentPrice);

        // If profit >= 1%, open order to close the position, reset Account Balance and Position Balance
        if ((positionPrice - currentPrice) / currentPrice >= targetProfit) {
          accountAPI.newOrderMarket(tradePair, "BUY", positionPlaced);
          console.log(
            `Profit earned: ${
              ((positionPrice - currentPrice) * positionPlaced) /
              accountLeverage
            }`
          );
          positionPrice = positionAmt = 0;
          clearInterval(interval);
          return init();
        }
        if ((positionPrice - currentPrice) / currentPrice <= stopLoss) {
          accountAPI.newOrderMarket(tradePair, "BUY", positionPlaced);
          console.log(
            `Loss for: ${
              ((positionPrice - currentPrice) * positionPlaced) /
              accountLeverage
            }`
          );
          positionPrice = positionAmt = 0;
          clearInterval(interval);
          return init();
        }
      }

      // If position is long
      if (positionAmt > 0) {
        const currentPriceArr = (
          await marketAPI.checkPrice(tradePair, "30m")
        )[0];
        const currentPrice = +currentPriceArr[4];
        console.log(currentPrice);

        // If profit >= 1%, open order to close the position, reset Account Balance and Position Balance
        if ((currentPrice - positionPrice) / positionPrice >= targetProfit) {
          accountAPI.newOrderMarket(tradePair, "SELL", positionPlaced);
          console.log(
            `Profit earned: ${
              ((currentPrice - positionPrice) * positionPlaced) /
              accountLeverage
            }`
          );
          positionPrice = positionAmt = 0;
          clearInterval(interval);
          return init();
        }
        if ((currentPrice - positionPrice) / positionPrice <= stopLoss) {
          accountAPI.newOrderMarket(tradePair, "SELL", positionPlaced);
          console.log(
            `Loss for: ${
              ((currentPrice - positionPrice) * positionPlaced) /
              accountLeverage
            }`
          );
          positionPrice = positionAmt = 0;
          clearInterval(interval);
          return init();
        }
      }
    }, 1000);
  }

  if (positionAmt === 0) {
    clearInterval(interval);
    // to check prevEMA
  }

  // const response = await accountAPI.newOrderMarket("BTCUSDT", "SELL", 0.01);
  // console.log(response);

  // const closingPrice = (await marketAPI.checkPrice("BTCUSDT", "30m", 61)).map(
  //   (el) => +el[4]
  // );

  // const currentEMA7 = TA.calculateEMA(7, closingPrice)[0];
  // const currentEMA25 = TA.calculateEMA(25, closingPrice)[0];
  // const currentNetEMA = currentEMA7 - currentEMA25;

  // console.log(currentEMA7, currentEMA25, currentNetEMA);

  // marketAPI
  //   .checkPrice("BTCUSDT", "30m", 61)
  //   .then((data) => data.map((el) => +el[4]))
  //   .then((closingPriceArr) =>
  //     console.log(TA.calculateEMA(7, closingPriceArr)[0])
  //   );
};

init();
