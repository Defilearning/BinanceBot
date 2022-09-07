const accountAPI = require("./API/accountAPI");
const marketAPI = require("./API/marketAPI");
const TA = require("./technical_Indicator");
const fs = require("fs");

//-------------------------------------------------------------------------------------------------
// Global setting for 1st time
//-------------------------------------------------------------------------------------------------
let accountFiat = "BUSD";
let accountMargin = "ISOLATED";
let accountLeverage = 50;
let tradePair = "BTCBUSD";
let defaultStopLossPer = 0.0022;
let defaultTargetProfitPer = 0.0044;

let lowestStopLossPer = 0.001;
let highestStopLossPer = 0.0035;
let riskStopLossPrice = 5;
let targetRewardRatio = 2;
let decimalToFixed = 3;

let global4hNonTradeRestriction = 0.0025;

let positionIntervalSec = 1;
let OrderIntervalMin = 5;
let orderTimeFrame = "5m";
let loopStopCandleCounter = 7;

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

        // Set target profit Price = entryPrice - (HighestPrice - entryPrice) * targetRewardRatio
        targetProfitPrice =
          positionPrice -
            (loopFinalPrice - positionPrice) * targetRewardRatio ||
          positionPrice * (1 - defaultTargetProfitPer);

        // Set loop for target profit or stop loss
        loopInterval = setInterval(async () => {
          const currentPrice = (
            await marketAPI.checkPrice(tradePair, orderTimeFrame)
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

            // clear interval
            clearInterval(loopInterval);

            // Settimeout 2 sec to return init for safeguard purpose
            setTimeout(() => {
              return init();
            }, 1000 * 2);
          }

          //----------------------------------------------------------------------
          // If hit target profit price
          //----------------------------------------------------------------------
          else if (currentPrice <= targetProfitPrice) {
            // Fill market to close SHORT position
            const orderResponse = await accountAPI.newOrderMarket(
              tradePair,
              "BUY",
              positionPlaced
            );

            console.log(`Take Profit: Quantity = ${orderResponse.origQty}`);

            // reset stop loss, target profit and loop final price
            stopLossPrice = targetProfitPrice = loopFinalPrice = "";

            // clear interval
            clearInterval(loopInterval);

            // Settimeout 2 sec to return init for safeguard purpose
            setTimeout(() => {
              return init();
            }, 1000 * 2);
          } else {
            // console.log(`${currentPrice} not fit TP or SL`);
          }
        }, 1000 * positionIntervalSec);
      }

      //----------------------------------------------------------------------
      // If it is LONG position
      //----------------------------------------------------------------------
      else if (positionAmt > 0) {
        // Set stop loss Price = entryPrice + (LowestPrice - entryPrice) === LOWEST PRICE
        stopLossPrice =
          loopFinalPrice || positionPrice * (1 - defaultStopLossPer);

        // Set target profit Price = entryPrice - (LowestPrice - entryPrice) * targetRewardRatio
        targetProfitPrice =
          positionPrice -
            (loopFinalPrice - positionPrice) * targetRewardRatio ||
          positionPrice * (1 + defaultTargetProfitPer);

        // Set loop for target profit or stop loss
        loopInterval = setInterval(async () => {
          const currentPrice = (
            await marketAPI.checkPrice(tradePair, orderTimeFrame)
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

            // clear interval
            clearInterval(loopInterval);

            // Settimeout 2 sec to return init for safeguard purpose
            setTimeout(() => {
              return init();
            }, 1000 * 2);
          }

          //----------------------------------------------------------------------
          // If hit target profit price
          //----------------------------------------------------------------------
          else if (currentPrice >= targetProfitPrice) {
            // Fill market to close LONG position
            const orderResponse = await accountAPI.newOrderMarket(
              tradePair,
              "SELL",
              positionPlaced
            );

            console.log(`Target Profit: Quantity = ${orderResponse.origQty}`);

            // reset stop loss, target profit and loop final price
            stopLossPrice = targetProfitPrice = loopFinalPrice = "";

            // clear interval
            clearInterval(loopInterval);

            // Settimeout 2 sec to return init for safeguard purpose
            setTimeout(() => {
              return init();
            }, 1000 * 2);
          } else {
            // console.log(`${currentPrice} not fit TP or SL`);
          }
        }, 1000 * positionIntervalSec);
      }
    }

    //----------------------------------------------------------------------
    // IF THERE IS NO POSITION
    //----------------------------------------------------------------------
    else if (positionAmt === 0) {
      // 1st criteria - 1d EMA 200
      // TOCHANGE:
      // const closingPrice1d = (
      //   await marketAPI.checkPrice(tradePair, "1d", 485)
      // ).map((el) => +el[4]);

      // let currentEMA1d = TA.calculateEMA(200, closingPrice1d)[0]; // TOCHANGE:

      // 2nd criteria - 4h EMA50
      const closingPrice4h = (
        await marketAPI.checkPrice(tradePair, "4h", 150)
      ).map((el) => +el[4]);
      let currentEMA4h = TA.calculateEMA(50, closingPrice4h)[0];

      // 3rd criteria - 1m RSI
      const closingPriceRSI = (
        await marketAPI.checkPrice(tradePair, orderTimeFrame, 50)
      ).map((el) => +el[4]);
      let currentClosingPrice = closingPriceRSI[0];
      let currentRSI1m = TA.calculateRSI(14, closingPriceRSI);

      //----------------------------------------------------------------------
      // To match 1st and 2nd criteria:
      // Above 1d EMA && 1m EMA && global EMA > 1.005 && RSI 1m < 30
      //----------------------------------------------------------------------
      if (
        // TOCHANGE:
        // currentClosingPrice > currentEMA1d &&
        currentClosingPrice >
          currentEMA4h * (1 + global4hNonTradeRestriction) &&
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
            orderTimeFrame,
            20
          );

          const loopClosingPriceArr1m = loopCheckPrice1m.map((el) => +el[4]);
          let loopCurrentEMA1m = TA.calculateEMA(9, loopClosingPriceArr1m)[0];

          // Map array with the lowest price for current and prev candle
          const loopLowestPriceArr1m = loopCheckPrice1m.map((el) => +el[3]);

          // to set lowest price for the 1st candle(stop loss price)
          if (loopCounter === 1) {
            loopFinalPrice =
              loopLowestPriceArr1m[0] < loopLowestPriceArr1m[1]
                ? loopLowestPriceArr1m[0]
                : loopLowestPriceArr1m[1];
          } else {
            // to set lowest price for the prev candle(stop loss price)
            loopFinalPrice =
              loopLowestPriceArr1m[1] < loopFinalPrice
                ? loopLowestPriceArr1m[1]
                : loopFinalPrice;
          }

          // to set lowest price if current candle < prev candle
          if (loopLowestPriceArr1m[0] < loopFinalPrice) {
            loopFinalPrice = loopLowestPriceArr1m[0];
          }

          //----------------------------------------------------------------------
          // to reset loop counter if RSI is continuously less than 30
          //----------------------------------------------------------------------
          const loopPriceRSI = (
            await marketAPI.checkPrice(tradePair, orderTimeFrame, 50)
          ).map((el) => +el[4]);
          let loopRSI1m = TA.calculateRSI(14, loopPriceRSI);

          if (loopRSI1m[0] < 30 && loopCounter > 1) {
            loopCounter = 1;
            console.log(
              `${new Date()} Current RSI: ${
                loopRSI1m[0]
              } is below 30, hence loop counter reset!`
            );
          }

          //----------------------------------------------------------------------
          // to log current runtime and all the info
          //----------------------------------------------------------------------
          const loopClosingPrice1m = loopClosingPriceArr1m[0];
          console.log(
            `This is ${loopCounter} runtime: EMA9=${loopCurrentEMA1m}, Lowest Price = ${loopFinalPrice}, Closing Price = ${loopClosingPrice1m}`
          );

          //----------------------------------------------------------------------
          // to void loop if closing price is > Global EMA 240 * 0.995
          //----------------------------------------------------------------------
          if (
            loopFinalPrice <
            currentEMA4h * (1 + global4hNonTradeRestriction)
          ) {
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

            // If stop loss percentage < lowest stop loss percentage || > highest stop loss percentage, return init()
            if (
              stopLossPercentage < lowestStopLossPer ||
              stopLossPercentage > highestStopLossPer
            ) {
              console.log(
                `Runtime has stopped due to stop loss percentage is < ${
                  lowestStopLossPer * 100
                }% or > ${(highestStopLossPer * 100).toFixed(
                  2
                )}%: Current percentage - ${stopLossPercentage * 100}%`
              );
              loopFinalPrice = "";
              clearInterval(loopInterval);
              return init();
            }

            // To calculate order quantity
            let orderQuantity = (nextOrderPrice / loopClosingPrice1m).toFixed(
              decimalToFixed
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

            // Settimeout 2 sec to return init for safeguard purpose
            setTimeout(() => {
              return init();
            }, 1000 * 2);
          }

          // To increase loop counter if criteria not fit
          loopCounter++;
        }, 1000 * 60 * OrderIntervalMin);
      }

      //----------------------------------------------------------------------
      //Below 1d EMA && 1m EMA && global EMA < 99.5% && RSI 1m >70
      //----------------------------------------------------------------------
      else if (
        //TOCHANGE:
        // currentClosingPrice < currentEMA1d &&
        currentClosingPrice <
          currentEMA4h * (1 - global4hNonTradeRestriction) &&
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
            orderTimeFrame,
            20
          );

          const loopClosingPriceArr1m = loopCheckPrice1m.map((el) => +el[4]);
          let loopCurrentEMA1m = TA.calculateEMA(9, loopClosingPriceArr1m)[0];

          // Map array with the highest price for current and prev candle
          const loopHighestPriceArr1m = loopCheckPrice1m.map((el) => +el[2]);

          // to set highest price for the 1st candle(stop loss price)
          if (loopCounter === 1) {
            loopFinalPrice =
              loopHighestPriceArr1m[0] > loopHighestPriceArr1m[1]
                ? loopHighestPriceArr1m[0]
                : loopHighestPriceArr1m[1];
          } else {
            // to set highest price for prev candle(stop loss price)
            loopFinalPrice =
              loopHighestPriceArr1m[1] > loopFinalPrice
                ? loopHighestPriceArr1m[1]
                : loopFinalPrice;
          }

          // to set highest price if current candle > prev candle
          if (loopHighestPriceArr1m[0] > loopFinalPrice) {
            loopFinalPrice = loopHighestPriceArr1m[0];
          }

          //----------------------------------------------------------------------
          // to reset loop counter if RSI is continuously less than 30
          //----------------------------------------------------------------------
          const loopPriceRSI = (
            await marketAPI.checkPrice(tradePair, orderTimeFrame, 50)
          ).map((el) => +el[4]);
          let loopRSI1m = TA.calculateRSI(14, loopPriceRSI);

          if (loopRSI1m[0] > 70 && loopCounter > 1) {
            loopCounter = 1;
            console.log(
              `${new Date()} Current RSI: ${
                loopRSI1m[0]
              } is above 70, hence loop counter reset!`
            );
          }

          //----------------------------------------------------------------------
          // to log current runtime and all the info
          //----------------------------------------------------------------------
          const loopClosingPrice1m = loopClosingPriceArr1m[0];
          console.log(
            `This is ${loopCounter} runtime: EMA9=${loopCurrentEMA1m}, Highest Price = ${loopFinalPrice}, Closing Price = ${loopClosingPrice1m}`
          );

          //----------------------------------------------------------------------
          // to void loop if closing price is > Global EMA 240 * 0.995
          //----------------------------------------------------------------------

          if (
            loopFinalPrice >
            currentEMA4h * (1 - global4hNonTradeRestriction)
          ) {
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

            // If stop loss percentage < lowest stop loss percentage || > highest stop loss percentage, return init()
            if (
              stopLossPercentage < lowestStopLossPer ||
              stopLossPercentage > highestStopLossPer
            ) {
              console.log(
                `Runtime has stopped due to stop loss percentage is < ${
                  lowestStopLossPer * 100
                }% or > ${(highestStopLossPer * 100).toFixed(
                  2
                )}%: Current percentage - ${stopLossPercentage * 100}%`
              );
              loopFinalPrice = "";
              clearInterval(loopInterval);
              return init();
            }

            // To calculate order quantity
            let orderQuantity = (nextOrderPrice / loopClosingPrice1m).toFixed(
              decimalToFixed
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

            // Settimeout 2 sec to return init for safeguard purpose
            setTimeout(() => {
              return init();
            }, 1000 * 2);
          }

          // To increase loop counter if criteria not fit
          loopCounter++;
        }, 1000 * 60 * OrderIntervalMin);
      } else {
        //----------------------------------------------------------------------
        // If there is no Criteria met at all, return to init()
        //----------------------------------------------------------------------
        setTimeout(() => {
          // console.log(
          //   `None criteria fit as at ${new Date()}, return to watch mode!`
          // );
          return init();
        }, 1000 * 60 * OrderIntervalMin);
      }
    }
  } catch (err) {
    const stackTrace = {};
    Error.captureStackTrace(stackTrace);

    if (err.response) {
      fs.appendFileSync(
        "BinanceError.txt",
        `\n${new Date()}: Error - ${err.response.data.msg}\n${
          stackTrace.stack
        }\n-----------------------------------------------------------------------------------`
      );
    } else {
      fs.appendFileSync(
        "BinanceError.txt",
        `\n${new Date()}: Error - ${err.toString()}\n-----------------------------------------------------------------------------------`
      );
    }
    console.log(`----------------------------------------`);
    console.log(`System down, restarting in 5 seconds:-`);
    console.log(`----------------------------------------`);
    setTimeout(() => {
      return init();
    }, 1000 * 5);
  }
};

init();

process.on("uncaughtException", (err) => {
  console.log(err);
  process.exit(1);
});
