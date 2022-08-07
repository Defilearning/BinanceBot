const accountAPI = require("./API/accountAPI");
const marketAPI = require("./API/marketAPI");
const TA = require("./technical_Indicator");

//-------------------------------------------------------------------------------------------------
// Global setting for 1st time
//-------------------------------------------------------------------------------------------------
let accountFiat = "USDT";
let accountMargin = "ISOLATED";
let accountLeverage = 5;
let tradePair = "ETHUSDT";
let accountPercentage = 1;

let positionIntervalSec = 1;
let OrderIntervalMin = 1;
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

    // To calculate next order amount
    let nextOrderPrice =
      accountAvailableBalance * accountPercentage > 11
        ? accountAvailableBalance * accountPercentage
        : 11;

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
        stopLossPrice = loopFinalPrice;

        // Set target profit Price = entryPrice - (HighestPrice - entryPrice) * 1.5
        targetProfitPrice =
          positionPrice - (loopFinalPrice - positionPrice) * 1.5;

        // Set loop for target profit or stop loss
        loopInterval = setInterval(async () => {
          const currentPrice = (
            await marketAPI.checkPrice(tradePair, "1m")
          )[0][4];

          //----------------------------------------------------------------------
          // If hit stop loss price
          //----------------------------------------------------------------------
          if (currentPrice >= stopLossPrice) {
            //TOCHANGE: change to POST request
            console.log(`New order submitted to cut loss!`);

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
            //TOCHANGE: change to POST request
            console.log(`New order submitted to take profit!`);

            // reset stop loss, target profit and loop final price
            stopLossPrice = targetProfitPrice = loopFinalPrice = "";

            // clear interval and return to init
            clearInterval(loopInterval);
            return init();
          }
        }, 1000 * positionIntervalSec);
      }

      //----------------------------------------------------------------------
      // If it is LONG position
      //----------------------------------------------------------------------
      if (positionAmt > 0) {
        // Set stop loss Price = entryPrice + (LowestPrice - entryPrice) === LOWEST PRICE
        stopLossPrice = loopFinalPrice;

        // Set target profit Price = entryPrice - (LowestPrice - entryPrice) * 1.5
        targetProfitPrice =
          positionPrice - (loopFinalPrice - positionPrice) * 1.5;

        // Set loop for target profit or stop loss
        loopInterval = setInterval(async () => {
          const currentPrice = (
            await marketAPI.checkPrice(tradePair, "1m")
          )[0][4];

          //----------------------------------------------------------------------
          // If hit stop loss price
          //----------------------------------------------------------------------
          if (currentPrice <= stopLossPrice) {
            //TOCHANGE: change to POST request
            console.log(`New order submitted to cut loss!`);

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
            //TOCHANGE: change to POST request
            console.log(`New order submitted to take profit!`);

            // reset stop loss, target profit and loop final price
            stopLossPrice = targetProfitPrice = loopFinalPrice = "";

            // clear interval and return to init
            clearInterval(loopInterval);
            return init();
          }
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

      // 2nd criteria - 1m EMA240
      const closingPrice1m = (
        await marketAPI.checkPrice(tradePair, "1m", 470)
      ).map((el) => +el[4]);
      let currentEMA1m = TA.calculateEMA(240, closingPrice1m)[0];

      // 3rd criteria - 1m RSI
      let currentRSI1m = TA.calculateRSI(14, closingPrice1m);

      //----------------------------------------------------------------------
      // To match 1st and 2nd criteria:
      // Above 1d EMA && 1m EMA && global EMA > 1.005 && RSI 1m < 30
      //----------------------------------------------------------------------
      if (
        currentClosingPrice > currentEMA1d &&
        currentClosingPrice > currentEMA1m &&
        currentClosingPrice > currentEMA1d * 1.005 &&
        currentRSI1m < 30
      ) {
        console.log(`Criteria to enter 7 candle loop for LONG POSITION:-`);
        // To set up loop
        let loopCounter = 1;
        loopInterval = setInterval(async () => {
          // If loop > N times, clear the loop, global loop final price and return init
          if (loopCounter === loopStopCandleCounter + 1) {
            clearInterval(loopInterval);
            loopFinalPrice = "";
            console.log(
              `7 candle has passed and no order made, return to watch mode!`
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
          loopFinalPrice = loopCheckPrice1m.slice(0, 1)[0][3];
          const loopClosingPrice1m = loopCheckPrice1m.slice(0, 1)[0][4];

          console.log(
            `${new Date()} this is ${loopCounter} runtime: EMA9=${loopCurrentEMA1m}, Lowest Price = ${loopFinalPrice}, Closing Price = ${loopClosingPrice1m}`
          );

          // to check if closing price below EMA9, if Yes, open SHORT order
          if (loopClosingPrice1m > loopCurrentEMA1m) {
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
              `${orderResponse.positionSide}: Average Price = ${orderResponse.avgPrice}, Quantity = ${orderResponse.origQty}`
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
        currentClosingPrice < currentEMA1d &&
        currentClosingPrice < currentEMA1m &&
        currentClosingPrice < currentEMA1d * 0.995 &&
        currentRSI1m > 70
      ) {
        console.log(`Criteria to enter 7 candle loop for SHORT POSITION:-`);
        // To set up loop
        let loopCounter = 1;
        loopInterval = setInterval(async () => {
          // If loop > N times, clear the loop, global loop final price and return init
          if (loopCounter === loopStopCandleCounter + 1) {
            clearInterval(loopInterval);
            loopFinalPrice = "";
            console.log(
              `7 candle has passed and no order made, return to watch mode!`
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
          loopFinalPrice = loopCheckPrice1m.slice(0, 1)[0][2];
          const loopClosingPrice1m = loopCheckPrice1m.slice(0, 1)[0][4];

          console.log(
            `${new Date()} this is ${loopCounter} runtime: EMA9=${loopCurrentEMA1m}, Highest Price = ${loopFinalPrice}, Closing Price = ${loopClosingPrice1m}`
          );

          // to check if closing price below EMA9, if Yes, open SHORT order
          if (loopClosingPrice1m < loopCurrentEMA1m) {
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
              `${orderResponse.positionSide}: Average Price = ${orderResponse.avgPrice}, Quantity = ${orderResponse.origQty}`
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

    //////////////////////////////////////////////////////////////////////////////
  } catch (err) {
    console.log(err);
    // console.log(`--System down, restarting:--`);
    // return init();
  }
};

init();
