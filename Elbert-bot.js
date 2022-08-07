const accountAPI = require("./API/accountAPI");
const marketAPI = require("./API/marketAPI");
const TA = require("./technical_Indicator");

//-------------------------------------------------------------------------------------------------
// Global setting for 1st time
//-------------------------------------------------------------------------------------------------
let accountFiat = "USDT";
let accountMargin = "ISOLATED";
let accountLeverage = 20;
let tradePair = "ETHUSDT";

let riskStopLossPrice = 1;

let positionIntervalSec = 1;
let OrderIntervalMin = 1;
let loopStopCandleCounter = 7;
let defaultStopLossPer = 0.01;
let defaultTargetProfitPer = 0.015;

let loopInterval, loopFinalPrice, targetProfitPrice, stopLossPrice;

accountAPI
  .initialMargin(tradePair, accountMargin)
  .then((data) =>
    console.log(
      data.startsWith("No")
        ? `Account is set to ${accountMargin}, ${data}`
        : `${data}`
    )
  );
accountAPI
  .initialLeverage(tradePair, accountLeverage)
  .then((data) => console.log(data));

//-------------------------------------------------------------------------------------------------
// Init apps
//-------------------------------------------------------------------------------------------------
const init = async () => {
  try {
    // 1)Set up Account Balance, preEMA and Position Balance (if available)
    // Check account balance
    let accountAvailableBalance = +(await accountAPI.checkFutureBalance()).find(
      (el) => el.asset === accountFiat
    ).availableBalance;
    // console.log(`Account ${accountFiat}: ${accountAvailableBalance}`);

    if (accountAvailableBalance < 11) {
      console.log(`Account not available balance, Please top up!`);
      return;
    }

    // To set up current position price and current position quantity
    const position = (await accountAPI.checkPosition(tradePair))[0];
    let positionAmt = +position.positionAmt;
    let positionPrice = +position.entryPrice;
    let positionPlaced = Math.abs(positionAmt);

    //----------------------------------------------------------------------
    // IF THERE IS POSITION
    //----------------------------------------------------------------------
    if (positionAmt !== 0) {
      //----------------------------------------------------------------------
      // If it is SHORT position
      //----------------------------------------------------------------------
      if (position.positionAmt.startsWith("-")) {
        // Set stop loss Price = entryPrice + (HighestPrice - entryPrice) === HIGHEST PRICE
        stopLossPrice =
          loopFinalPrice || positionPrice * (1 + defaultStopLossPer);

        // Set target profit Price = entryPrice - (HighestPrice - entryPrice) * 1.5
        targetProfitPrice =
          positionPrice - (loopFinalPrice - positionPrice) * 1.5 ||
          positionPrice * (1 - defaultTargetProfitPer);

        // Set loop for target profit or stop loss
        loopInterval = setInterval(async () => {
          const currentPrice = (
            await marketAPI.checkPrice(tradePair, "1m")
          )[0][4];

          //----------------------------------------------------------------------
          // If hit stop loss price
          //----------------------------------------------------------------------
          if (currentPrice >= stopLossPrice) {
            // Fill market to close SHORT position
            const orderResponse = await accountAPI.newOrderMarket(
              tradePair,
              "BUY",
              positionPlaced
            );

            console.log(`Stop Loss: Quantity = ${orderResponse.origQty}`);

            // reset stop loss, target profit and loop final price
            stopLossPrice = targetProfitPrice = loopFinalPrice = "";

            // clear interval and return to init
            clearInterval(loopInterval);
            return init();
          }

          //----------------------------------------------------------------------
          // If hit target profit price
          //----------------------------------------------------------------------
          if (currentPrice <= targetProfitPrice) {
            // Fill market to close SHORT position
            const orderResponse = await accountAPI.newOrderMarket(
              tradePair,
              "BUY",
              positionPlaced
            );

            console.log(`Take Profit: Quantity = ${orderResponse.origQty}`);

            // reset stop loss, target profit and loop final price
            stopLossPrice = targetProfitPrice = loopFinalPrice = "";

            // clear interval and return to init
            clearInterval(loopInterval);
            return init();
          }

          console.log(`${currentPrice} not fit TP or SL`);
        }, 1000 * positionIntervalSec);
      }

      //----------------------------------------------------------------------
      // If it is LONG position
      //----------------------------------------------------------------------
      if (positionAmt > 0) {
        // Set stop loss Price = entryPrice + (LowestPrice - entryPrice) === LOWEST PRICE
        stopLossPrice =
          loopFinalPrice || positionPrice * (1 - defaultStopLossPer);

        // Set target profit Price = entryPrice - (LowestPrice - entryPrice) * 1.5
        targetProfitPrice =
          positionPrice - (loopFinalPrice - positionPrice) * 1.5 ||
          positionPrice * (1 + defaultTargetProfitPer);

        // Set loop for target profit or stop loss
        loopInterval = setInterval(async () => {
          const currentPrice = (
            await marketAPI.checkPrice(tradePair, "1m")
          )[0][4];

          //----------------------------------------------------------------------
          // If hit stop loss price
          //----------------------------------------------------------------------
          if (currentPrice <= stopLossPrice) {
            // Fill market to close LONG position
            const orderResponse = await accountAPI.newOrderMarket(
              tradePair,
              "SELL",
              positionPlaced
            );

            console.log(`Stop Loss: Quantity = ${orderResponse.origQty}`);

            // reset stop loss, target profit and loop final price
            stopLossPrice = targetProfitPrice = loopFinalPrice = "";

            // clear interval and return to init
            clearInterval(loopInterval);
            return init();
          }

          //----------------------------------------------------------------------
          // If hit target profit price
          //----------------------------------------------------------------------
          if (currentPrice >= targetProfitPrice) {
            // Fill market to close LONG position
            const orderResponse = await accountAPI.newOrderMarket(
              tradePair,
              "SELL",
              positionPlaced
            );

            console.log(`Target Profit: Quantity = ${orderResponse.origQty}`);

            // reset stop loss, target profit and loop final price
            stopLossPrice = targetProfitPrice = loopFinalPrice = "";

            // clear interval and return to init
            clearInterval(loopInterval);
            return init();
          }

          console.log(`${currentPrice} not fit TP or SL`);
        }, 1000 * positionIntervalSec);
      }
    }

    //----------------------------------------------------------------------
    // IF THERE IS NO POSITION
    //----------------------------------------------------------------------
    if (positionAmt === 0) {
      // 1st criteria - 1d EMA 200
      const closingPrice1d = (
        await marketAPI.checkPrice(tradePair, "1d", 485)
      ).map((el) => +el[4]);

      let currentClosingPrice = closingPrice1d[0];
      let currentEMA1d = TA.calculateEMA(200, closingPrice1d)[0];

      // 2nd criteria - 4h EMA50
      const closingPrice4h = (
        await marketAPI.checkPrice(tradePair, "4h", 150)
      ).map((el) => +el[4]);
      let currentEMA4h = TA.calculateEMA(50, closingPrice4h)[0];

      // 3rd criteria - 1m RSI
      const closingPriceRSI = (
        await marketAPI.checkPrice(tradePair, "1m", 150)
      ).map((el) => +el[4]);
      let currentRSI1m = TA.calculateRSI(14, closingPriceRSI);

      //----------------------------------------------------------------------
      // To match 1st and 2nd criteria:
      // Above 1d EMA && 1m EMA && global EMA > 1.005 && RSI 1m < 30
      //----------------------------------------------------------------------
      if (
        // TOCHANGE:
        // currentClosingPrice > currentEMA1d &&
        currentClosingPrice > currentEMA4h * 1.005 &&
        currentRSI1m[0] < 30
      ) {
        console.log(
          `${new Date()} - Criteria to enter ${loopStopCandleCounter} candle loop for LONG POSITION:-`
        );
        // To set up loop
        let loopCounter = 1;
        loopInterval = setInterval(async () => {
          // If loop > N times, clear the loop, global loop final price and return init
          if (loopCounter === loopStopCandleCounter + 1) {
            clearInterval(loopInterval);
            loopFinalPrice = "";
            console.log(
              `${loopStopCandleCounter} candle has passed and no order made, return to watch mode!`
            );
            return init();
          }

          // To get 1m chart for EMA, closing price and highest price
          const loopCheckPrice1m = await marketAPI.checkPrice(
            tradePair,
            "1m",
            20
          );

          const loopClosingPriceArr1m = loopCheckPrice1m.map((el) => +el[4]);
          let loopCurrentEMA1m = TA.calculateEMA(9, loopClosingPriceArr1m)[0];

          // to set lowest price(stop loss price)
          loopFinalPrice =
            loopCheckPrice1m.slice(0, 1)[0][3] < loopFinalPrice
              ? loopCheckPrice1m.slice(0, 1)[0][3]
              : loopFinalPrice;
          const loopClosingPrice1m = loopCheckPrice1m.slice(0, 1)[0][4];

          console.log(
            `This is ${loopCounter} runtime: EMA9=${loopCurrentEMA1m}, Lowest Price = ${loopFinalPrice}, Closing Price = ${loopClosingPrice1m}`
          );

          //----------------------------------------------------------------------
          // to void loop if closing price is > Global EMA 240 * 0.995
          //----------------------------------------------------------------------
          if (loopFinalPrice < currentEMA4h * 1.005) {
            console.log(
              `Runtime has stopped due to closing price is closed to 0.5% of Global EMA`
            );
            loopFinalPrice = "";
            clearInterval(loopInterval);
            return init();
          }

          //----------------------------------------------------------------------
          // to check if closing price below EMA9, if Yes, open LONG order
          //----------------------------------------------------------------------
          if (loopClosingPrice1m > loopCurrentEMA1m) {
            // Calculate Stop Loss percentage
            let stopLossPercentage =
              (loopClosingPrice1m - loopFinalPrice) / loopClosingPrice1m;

            // To calculate 1R (Risk and reward)
            let nextOrderPrice = riskStopLossPrice / stopLossPercentage;

            // If order price < 11, order price === 11
            if (nextOrderPrice < 11) {
              nextOrderPrice = 11;
            }

            // If order price > account balance * leverage, order price === account balance * account leverage
            if (nextOrderPrice > accountAvailableBalance * accountLeverage) {
              nextOrderPrice = accountAvailableBalance * accountLeverage;
            }

            // To calculate order quantity
            let orderQuantity = (nextOrderPrice / loopClosingPrice1m).toFixed(
              3
            );

            // Fill market order for LONG position
            const orderResponse = await accountAPI.newOrderMarket(
              tradePair,
              "BUY",
              orderQuantity
            );

            console.log(
              `${orderResponse.positionSide}: Quantity = ${orderResponse.origQty}`
            );

            clearInterval(loopInterval);
            return init();
          }

          // To increase loop counter if criteria not fit
          loopCounter++;
        }, 1000 * 60 * OrderIntervalMin);
      }

      //----------------------------------------------------------------------
      //Below 1d EMA && 1m EMA && global EMA < 99.5% && RSI 1m >70
      //----------------------------------------------------------------------
      if (
        //TOCHANGE:
        // currentClosingPrice < currentEMA1d &&
        currentClosingPrice < currentEMA4h * 0.995 &&
        currentRSI1m[0] > 70
      ) {
        console.log(
          `${new Date()} - Criteria to enter ${loopStopCandleCounter} candle loop for SHORT POSITION:-`
        );
        // To set up loop
        let loopCounter = 1;
        loopInterval = setInterval(async () => {
          // If loop > N times, clear the loop, global loop final price and return init
          if (loopCounter === loopStopCandleCounter + 1) {
            clearInterval(loopInterval);
            loopFinalPrice = "";
            console.log(
              `${loopStopCandleCounter} candle has passed and no order made, return to watch mode!`
            );
            return init();
          }

          // To get 1m chart for EMA, closing price and highest price
          const loopCheckPrice1m = await marketAPI.checkPrice(
            tradePair,
            "1m",
            20
          );

          const loopClosingPriceArr1m = loopCheckPrice1m.map((el) => +el[4]);
          let loopCurrentEMA1m = TA.calculateEMA(9, loopClosingPriceArr1m)[0];

          // to set highest price(stop loss price)
          loopFinalPrice =
            loopCheckPrice1m.slice(0, 1)[0][2] > loopFinalPrice
              ? loopCheckPrice1m.slice(0, 1)[0][2]
              : loopFinalPrice;
          const loopClosingPrice1m = loopCheckPrice1m.slice(0, 1)[0][4];

          console.log(
            `This is ${loopCounter} runtime: EMA9=${loopCurrentEMA1m}, Highest Price = ${loopFinalPrice}, Closing Price = ${loopClosingPrice1m}`
          );

          //----------------------------------------------------------------------
          // to void loop if closing price is > Global EMA 240 * 0.995
          //----------------------------------------------------------------------
          if (loopFinalPrice > currentEMA4h * 0.995) {
            console.log(
              `Runtime has stopped due to closing price is closed to 0.5% of Global EMA`
            );
            loopFinalPrice = "";
            clearInterval(loopInterval);
            return init();
          }

          //----------------------------------------------------------------------
          // to check if closing price below EMA9, if Yes, open SHORT order
          //----------------------------------------------------------------------
          if (loopClosingPrice1m < loopCurrentEMA1m) {
            // Calculate Stop Loss percentage
            let stopLossPercentage =
              (loopFinalPrice - loopClosingPrice1m) / loopClosingPrice1m;

            // To calculate 1R (Risk and reward)
            let nextOrderPrice = riskStopLossPrice / stopLossPercentage;

            // If order price < 11, order price === 11
            if (nextOrderPrice < 11) {
              nextOrderPrice = 11;
            }

            // If order price > account balance * leverage, order price === account balance * account leverage
            if (nextOrderPrice > accountAvailableBalance * accountLeverage) {
              nextOrderPrice = accountAvailableBalance * accountLeverage;
            }

            // To calculate order quantity
            let orderQuantity = (nextOrderPrice / loopClosingPrice1m).toFixed(
              3
            );

            // Fill market order for SHORT position
            const orderResponse = await accountAPI.newOrderMarket(
              tradePair,
              "SELL",
              orderQuantity
            );

            console.log(
              `${orderResponse.positionSide}: Quantity = ${orderResponse.origQty}`
            );

            clearInterval(loopInterval);
            return init();
          }

          // To increase loop counter if criteria not fit
          loopCounter++;
        }, 1000 * 60 * OrderIntervalMin);
      }

      //----------------------------------------------------------------------
      // If there is no Criteria met at all, return to init()
      //----------------------------------------------------------------------
      setTimeout(() => {
        console.log(
          `None criteria fit as at ${new Date()}, return to watch mode!`
        );
        return init();
      }, 1000 * 60 * OrderIntervalMin);
    }
  } catch (err) {
    console.log(err);
    console.log(`----------------------------------------`);
    console.log(`System down, restarting:-`);
    console.log(`----------------------------------------`);
    return init();
  }
};

init();