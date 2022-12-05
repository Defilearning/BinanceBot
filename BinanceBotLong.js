const { initialLeverage, initialMargin } = require("./API/accountAPI");
const { checkPrice } = require("./API/marketAPI");
const { calculateEMA, calculateRSI } = require("./utils/technical_Indicator");
const {
  accountBalance,
  accountPosition,
  setTPSL,
  positionFilled,
  clearLoop,
  setOrderSLPrice,
  orderPriceAndQuantity,
  changeTargetRewardRatio,
  orderFilled,
  calculateDate,
} = require("./utils/functionModule");
const fs = require("fs");

//-------------------------------------------------------------------------------------------------
// Global setting for 1st time
//-------------------------------------------------------------------------------------------------

let { accountFiat, accountMargin, accountLeverage, tradePair } =
  require("./utils/GlobalData").accountData;
let {
  orderTimeFrame,
  global4hNonTradeRestriction,
  lowestStopLossPer,
  ChangeRewardRatioPer,
  highestStopLossPer,
  OrderIntervalMin,
  nearEMAStopCounter,
  nearEMAPer,
} = require("./utils/GlobalData").orderData;
let {
  accountData,
  positionData,
  loopInterval,
  loopStopCandleCounter,
} = require("./utils/GlobalData");
//-------------------------------------------------------------------------------------------------

initialMargin(tradePair, accountMargin).then((data) =>
  console.log(
    data?.startsWith("No")
      ? `Account is set to ${accountMargin}, ${data}`
      : `${data}`
  )
);
initialLeverage(tradePair, accountLeverage).then((data) => console.log(data));

//-------------------------------------------------------------------------------------------------
// Check current position to tally with Binance Database
let isCurrentPosition;
accountPosition(tradePair, positionData).then((data) => {
  if (data.positionAmt === 0) {
    isCurrentPosition = false;
  } else {
    isCurrentPosition = true;
  }
});

//-------------------------------------------------------------------------------------------------
// Init apps
//-------------------------------------------------------------------------------------------------
const init = async () => {
  try {
    // Check account Balance
    await accountBalance(accountFiat);

    // To set up current position price and current position quantity
    positionData = await accountPosition(tradePair, positionData);
    const { positionAmt, positionIntervalSec } = positionData;

    // NOTE: IF THERE IS POSITION
    if (positionAmt !== 0) {
      // Check clause to make sure Binance database updated
      if (!isCurrentPosition) {
        return setTimeout(() => {
          console.log("Database not updated yet, return in 2 second");
          return init();
        }, 2000);
      } else {
        // NOTE: If it is SHORT position
        if (positionAmt < 0) {
          // Set TP and SL
          positionData = setTPSL(positionData, "SHORT");
          const { stopLossPrice, targetProfitPrice } = positionData;

          // Set loop for target profit or stop loss
          loopInterval = setInterval(async () => {
            const currentPrice = await checkPrice(tradePair, orderTimeFrame);

            // NOTE: If hit stop loss price
            if (currentPrice >= stopLossPrice) {
              // Close SL position
              positionData = await positionFilled(
                tradePair,
                positionData,
                "SHORT",
                "SL",
                loopInterval
              );

              //To clear current position to false
              isCurrentPosition = false;

              // to Calculate cumulative PNL and date
              accountData = calculateDate(accountData, positionData, "SL");
              let { timeRemaining } = accountData;

              // Settimeout to return init
              return setTimeout(() => {
                return init();
              }, timeRemaining);
            }

            // NOTE: If hit target profit price
            else if (currentPrice <= targetProfitPrice) {
              // Close TP position
              positionData = await positionFilled(
                tradePair,
                positionData,
                "SHORT",
                "TP",
                loopInterval
              );

              //To clear current position to false
              isCurrentPosition = false;

              // to Calculate cumulative PNL and date
              accountData = calculateDate(accountData, positionData, "TP");
              let { timeRemaining } = accountData;

              // Settimeout to return init
              return setTimeout(() => {
                return init();
              }, timeRemaining);
            }
          }, 1000 * positionIntervalSec);
        }

        // NOTE:If it is LONG position
        else if (positionAmt > 0) {
          // Set TP and SL
          positionData = setTPSL(positionData, "LONG");
          const { stopLossPrice, targetProfitPrice } = positionData;

          // Set loop for target profit or stop loss
          loopInterval = setInterval(async () => {
            const currentPrice = await checkPrice(tradePair, orderTimeFrame);

            // NOTE: If hit stop loss price
            if (currentPrice <= stopLossPrice) {
              // Close SL position
              positionData = await positionFilled(
                tradePair,
                positionData,
                "LONG",
                "SL",
                loopInterval
              );

              //To clear current position to false
              isCurrentPosition = false;

              // to Calculate cumulative PNL and date
              accountData = calculateDate(accountData, positionData, "SL");
              let { timeRemaining } = accountData;

              // Settimeout to return init
              return setTimeout(() => {
                return init();
              }, timeRemaining);
            }

            // NOTE: If hit target profit price
            else if (currentPrice >= targetProfitPrice) {
              // Close TP position
              positionData = await positionFilled(
                tradePair,
                positionData,
                "LONG",
                "TP",
                loopInterval
              );

              //To clear current position to false
              isCurrentPosition = false;

              // to Calculate cumulative PNL and date
              accountData = calculateDate(accountData, positionData, "TP");
              let { timeRemaining } = accountData;

              // Settimeout to return init
              return setTimeout(() => {
                return init();
              }, timeRemaining);
            }
          }, 1000 * positionIntervalSec);
        }
      }
    }
    // NOTE: IF THERE IS NO POSITION
    else if (positionAmt === 0) {
      if (isCurrentPosition) {
        return setTimeout(() => {
          console.log("Database not updated yet, return in 2 second");
          return init();
        }, 2000);
      } else {
        // 1st criteria - 4h EMA50
        let currentEMA4h = await calculateEMA(tradePair, "4h", 150, 50);

        // 2nd criteria - 1m RSI
        let currentRSI1m = await calculateRSI(
          tradePair,
          orderTimeFrame,
          50,
          14
        );
        let currentClosingPrice = await checkPrice(tradePair, orderTimeFrame);

        // NOTE: To match 1st and 2nd criteria:
        // Above 1d EMA && 1m EMA && global EMA > 1.005 && RSI 1m < 30
        if (
          currentClosingPrice >
            currentEMA4h * (1 + global4hNonTradeRestriction) &&
          currentRSI1m < 30
        ) {
          console.log(
            `${new Date()} - Criteria to enter ${loopStopCandleCounter} candle loop for LONG POSITION:-`
          );
          // To set up loop
          let loopCounter = 1;
          loopInterval = setInterval(async () => {
            // If loop > N times, clear the loop, global loop final price and return init
            if (loopCounter === loopStopCandleCounter + 1) {
              positionData = clearLoop(positionData, loopInterval, "counter");
              return init();
            }

            // To get 1m chart for EMA, closing price and highest price
            let loopCurrentEMA1m = await calculateEMA(
              tradePair,
              orderTimeFrame,
              20,
              9
            );

            // Map array with the lowest price for current and prev candle
            const loopLowestPriceArr1m = await checkPrice(
              tradePair,
              orderTimeFrame,
              3,
              "lowest"
            );

            // set SL price
            positionData = setOrderSLPrice(
              positionData,
              loopCounter,
              loopLowestPriceArr1m,
              "long"
            );

            // NOTE: to reset loop counter if RSI is continuously less than 30
            let loopRSI1m = await calculateRSI(
              tradePair,
              orderTimeFrame,
              50,
              14
            );

            if (loopRSI1m < 30 && loopCounter > 1) {
              loopCounter = 1;
              console.log(
                `${new Date()} Current RSI: ${loopRSI1m} is below 30, hence loop counter reset!`
              );
            }

            // NOTE: to log current runtime and all the info
            const loopClosingPrice1m = await checkPrice(
              tradePair,
              orderTimeFrame
            );

            let { loopFinalPrice } = positionData;
            console.log(
              `This is ${loopCounter} runtime: EMA9 = ${loopCurrentEMA1m.toFixed(
                3
              )}, Lowest Price = ${loopFinalPrice}, Closing Price = ${loopClosingPrice1m}`
            );

            // NOTE: to void loop if closing price is > Global EMA 240 * 0.995
            if (
              loopFinalPrice <
              currentEMA4h * (1 + global4hNonTradeRestriction)
            ) {
              positionData = clearLoop(positionData, loopInterval, "globalEMA");
              return init();
            }

            // NOTE: to check if closing price below EMA9, if Yes, open LONG order
            if (loopClosingPrice1m > loopCurrentEMA1m) {
              // NOTE: If current price > current EMA * 1.005, extend 3 candle to watch
              if (loopClosingPrice1m > loopCurrentEMA1m * (1 + nearEMAPer)) {
                clearInterval(loopInterval);

                let nearEMALoopCounter = 1;
                console.log(
                  `As current price is > ${(nearEMAPer * 100).toFixed(
                    2
                  )}% of EMA9, hence ${nearEMAStopCounter} counter to fulfill criteria`
                );

                // Set up interval to watch 3 counter
                loopInterval = setInterval(async () => {
                  // If Counter > 3, return init
                  if (nearEMALoopCounter === nearEMAStopCounter + 1) {
                    clearInterval(loopInterval);
                    console.log(
                      `${nearEMAStopCounter} has passed and the price is > ${(
                        nearEMAPer * 100
                      ).toFixed(2)}% or < ${(nearEMAPer * 100).toFixed(
                        2
                      )}% of current EMA, hence return to watch mode`
                    );

                    return init();
                  }

                  const nearEMAPrice = await checkPrice(
                    tradePair,
                    orderTimeFrame
                  );

                  const loopEMAvalue = await calculateEMA(
                    tradePair,
                    orderTimeFrame,
                    20,
                    9
                  );

                  // Log counters information
                  console.log(
                    `This is ${nearEMALoopCounter} counter: EMA9 = ${loopEMAvalue.toFixed(
                      3
                    )}, Closing Price = ${nearEMAPrice}`
                  );

                  if (
                    //if price near EMA9, then calculate quantity and open position
                    nearEMAPrice < loopEMAvalue * (1 + nearEMAPer) &&
                    nearEMAPrice > loopEMAvalue * (1 - nearEMAPer)
                  ) {
                    const { stopLossPercentage, orderQuantity } =
                      orderPriceAndQuantity(nearEMAPrice, positionData, "long");

                    // If stop loss percentage < lowest stop loss percentage || > highest stop loss percentage, return init()
                    if (
                      stopLossPercentage < lowestStopLossPer ||
                      stopLossPercentage > highestStopLossPer
                    ) {
                      positionData = clearLoop(
                        positionData,
                        loopInterval,
                        "SLper",
                        stopLossPercentage
                      );
                      return init();
                    }

                    // To change reward ratio if stop loss % is between Highest and the % to change
                    positionData = changeTargetRewardRatio(
                      positionData,
                      stopLossPercentage
                    );

                    // Fill market order for LONG position
                    await orderFilled(
                      tradePair,
                      "long",
                      orderQuantity,
                      loopInterval
                    );

                    // To set guard clause which check with Binance Database
                    isCurrentPosition = true;

                    // Settimeout 2 sec to return init for safeguard purpose
                    return setTimeout(() => {
                      return init();
                    }, 1000 * 2);
                  } else {
                    nearEMALoopCounter++;
                  }
                }, 1000 * 60 * OrderIntervalMin);
              } else {
                const { stopLossPercentage, orderQuantity } =
                  orderPriceAndQuantity(
                    loopClosingPrice1m,
                    positionData,
                    "long"
                  );

                // If stop loss percentage < lowest stop loss percentage || > highest stop loss percentage, return init()
                if (
                  stopLossPercentage < lowestStopLossPer ||
                  stopLossPercentage > highestStopLossPer
                ) {
                  positionData = clearLoop(
                    positionData,
                    loopInterval,
                    "SLper",
                    stopLossPercentage
                  );
                  return init();
                }

                // To change reward ratio if stop loss % is between Highest and the % to change
                positionData = changeTargetRewardRatio(
                  positionData,
                  stopLossPercentage
                );

                // Fill market with LONG position
                await orderFilled(
                  tradePair,
                  "long",
                  orderQuantity,
                  loopInterval
                );

                // To set guard clause which check with Binance Database
                isCurrentPosition = true;

                // Settimeout 2 sec to return init for safeguard purpose
                return setTimeout(() => {
                  return init();
                }, 1000 * 2);
              }
            }

            // To increase loop counter if criteria not fit
            loopCounter++;
          }, 1000 * 60 * OrderIntervalMin);
        }

        //NOTE: Below 1d EMA && 1m EMA && global EMA < 99.5% && RSI 1m >70
        else if (
          currentClosingPrice <
            currentEMA4h * (1 - global4hNonTradeRestriction) &&
          currentRSI1m > 70 &&
          //NOTE: NO SHORT!!
          currentRSI1m <30 
        ) {
          console.log(
            `${new Date()} - Criteria to enter ${loopStopCandleCounter} candle loop for SHORT POSITION:-`
          );
          // To set up loop
          let loopCounter = 1;
          loopInterval = setInterval(async () => {
            // If loop > N times, clear the loop, global loop final price and return init
            if (loopCounter === loopStopCandleCounter + 1) {
              positionData = clearLoop(positionData, loopInterval, "counter");
              return init();
            }

            // To get 1m chart for EMA, closing price and highest price
            let loopCurrentEMA1m = await calculateEMA(
              tradePair,
              orderTimeFrame,
              20,
              9
            );

            // Map array with the highest price for current and prev candle
            const loopHighestPriceArr1m = await checkPrice(
              tradePair,
              orderTimeFrame,
              3,
              "highest"
            );

            // Set SL Price
            positionData = setOrderSLPrice(
              positionData,
              loopCounter,
              loopHighestPriceArr1m,
              "short"
            );

            // NOTE: to reset loop counter if RSI is continuously less than 30
            let loopRSI1m = await calculateRSI(
              tradePair,
              orderTimeFrame,
              50,
              14
            );
            if (loopRSI1m > 70 && loopCounter > 1) {
              loopCounter = 1;
              console.log(
                `${new Date()} Current RSI: ${loopRSI1m} is above 70, hence loop counter reset!`
              );
            }

            // NOTE: to log current runtime and all the info
            const loopClosingPrice1m = await checkPrice(
              tradePair,
              orderTimeFrame
            );

            let { loopFinalPrice } = positionData;
            console.log(
              `This is ${loopCounter} runtime: EMA9 = ${loopCurrentEMA1m.toFixed(
                3
              )}, Highest Price = ${loopFinalPrice}, Closing Price = ${loopClosingPrice1m}`
            );

            // NOTE: to void loop if closing price is > Global EMA 240 * 0.995

            if (
              loopFinalPrice >
              currentEMA4h * (1 - global4hNonTradeRestriction)
            ) {
              positionData = clearLoop(positionData, loopInterval, "globalEMA");
              return init();
            }

            // NOTE: to check if closing price below EMA9, if Yes, open SHORT order
            if (loopClosingPrice1m < loopCurrentEMA1m) {
              // NOTE: If current price < current EMA * 0.995, extend 3 candle to watch
              if (loopClosingPrice1m < loopCurrentEMA1m * (1 - nearEMAPer)) {
                clearInterval(loopInterval);

                let nearEMALoopCounter = 1;
                console.log(
                  `As current price is > ${(nearEMAPer * 100).toFixed(
                    2
                  )}% of EMA9, hence ${nearEMAStopCounter} counter to fulfill criteria`
                );

                loopInterval = setInterval(async () => {
                  // If Counter > 3, return init
                  if (nearEMALoopCounter === nearEMAStopCounter + 1) {
                    clearInterval(loopInterval);
                    console.log(
                      `${nearEMAStopCounter} has passed and the price is > ${(
                        nearEMAPer * 100
                      ).toFixed(2)}% or < ${(nearEMAPer * 100).toFixed(
                        2
                      )}% of current EMA, hence return to watch mode`
                    );

                    return init();
                  }

                  const nearEMAPrice = await checkPrice(
                    tradePair,
                    orderTimeFrame
                  );

                  const loopEMAvalue = await calculateEMA(
                    tradePair,
                    orderTimeFrame,
                    20,
                    9
                  );

                  // Log counters information
                  console.log(
                    `This is ${nearEMALoopCounter} counter: EMA9 = ${loopEMAvalue.toFixed(
                      3
                    )}, Closing Price = ${nearEMAPrice}`
                  );

                  if (
                    nearEMAPrice < loopEMAvalue * (1 + nearEMAPer) &&
                    nearEMAPrice > loopEMAvalue * (1 - nearEMAPer)
                  ) {
                    const { stopLossPercentage, orderQuantity } =
                      orderPriceAndQuantity(
                        nearEMAPrice,
                        positionData,
                        "short"
                      );

                    // If stop loss percentage < lowest stop loss percentage || > highest stop loss percentage, return init()
                    if (
                      stopLossPercentage < lowestStopLossPer ||
                      stopLossPercentage > highestStopLossPer
                    ) {
                      positionData = clearLoop(
                        positionData,
                        loopInterval,
                        "SLper",
                        stopLossPercentage
                      );
                      return init();
                    }

                    // To change reward ratio if stop loss % is between Highest and the % to change
                    positionData = changeTargetRewardRatio(
                      positionData,
                      stopLossPercentage
                    );

                    // Fill market order for LONG position
                    await orderFilled(
                      tradePair,
                      "short",
                      orderQuantity,
                      loopInterval
                    );

                    // To set guard clause which check with Binance Database
                    isCurrentPosition = true;

                    // Settimeout 2 sec to return init for safeguard purpose
                    return setTimeout(() => {
                      return init();
                    }, 1000 * 2);
                  } else {
                    nearEMALoopCounter++;
                  }
                }, 1000 * 60 * OrderIntervalMin);
              } else {
                const { stopLossPercentage, orderQuantity } =
                  orderPriceAndQuantity(
                    loopClosingPrice1m,
                    positionData,
                    "short"
                  );

                // If stop loss percentage < lowest stop loss percentage || > highest stop loss percentage, return init()
                if (
                  stopLossPercentage < lowestStopLossPer ||
                  stopLossPercentage > highestStopLossPer
                ) {
                  positionData = clearLoop(
                    positionData,
                    loopInterval,
                    "SLper",
                    stopLossPercentage
                  );
                  return init();
                }

                // To change reward ratio if stop loss % is between Highest and the % to change
                positionData = changeTargetRewardRatio(
                  positionData,
                  stopLossPercentage
                );

                // Fill market order for SHORT position
                await orderFilled(
                  tradePair,
                  "short",
                  orderQuantity,
                  loopInterval
                );

                // To set guard clause which check with Binance Database
                isCurrentPosition = true;

                // Settimeout 2 sec to return init for safeguard purpose
                return setTimeout(() => {
                  return init();
                }, 1000 * 2);
              }
            }
            // To increase loop counter if criteria not fit
            loopCounter++;
          }, 1000 * 60 * OrderIntervalMin);
        } else {
          // NOTE: If there is no Criteria met at all, return to init()
          return setTimeout(() => {
            // console.log(
            //   `None criteria fit as at ${new Date()}, return to watch mode!`
            // );
            return init();
          }, 1000 * 60 * OrderIntervalMin);
        }
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
    return setTimeout(() => {
      return init();
    }, 1000 * 5);
  }
};

init();

process.on("uncaughtException", (err) => {
  fs.appendFileSync(
    "BinanceError.txt",
    `\n${new Date()}: Error - ${err.toString()}\n-----------------------------------------------------------------------------------`
  );
  console.log(`----------------------------------------`);
  console.log(`System down on Uncaught Exception, forever restarting:-`);
  console.log(`----------------------------------------`);
  process.exit(1);
});

process.on("uncaughtRejection", (err) => {
  fs.appendFileSync(
    "BinanceError.txt",
    `\n${new Date()}: Error - ${err.toString()}\n-----------------------------------------------------------------------------------`
  );
  console.log(`----------------------------------------`);
  console.log(`System down on Uncaught Rejection, forever restarting:-`);
  console.log(`----------------------------------------`);
  process.exit(1);
});
