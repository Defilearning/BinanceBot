const {
  checkFutureBalance,
  checkPosition,
  newOrderMarket,
} = require("../API/accountAPI");
const { loopStopCandleCounter, orderData } = require("./GlobalData");
const {
  global4hNonTradeRestriction,
  lowestStopLossPer,
  highestStopLossPer,
  riskStopLossPrice,
  decimalToFixed,
} = require("./GlobalData").orderData;
const { readFileSync, writeFileSync } = require("fs");

///////////////////////////////////////////////////////////////////////////////////////////////////
exports.accountBalance = async (accountFiat) => {
  // 1)Set up Account Balance, preEMA and Position Balance (if available)
  // Check account balance
  let accountAvailableBalance = +(await checkFutureBalance()).find(
    (el) => el.asset === accountFiat
  ).availableBalance;
  // console.log(`Account ${accountFiat}: ${accountAvailableBalance}`);

  if (accountAvailableBalance < 11) {
    console.log(`Account not available balance, Please top up!`);
    return;
  }
};

///////////////////////////////////////////////////////////////////////////////////////////////////
exports.accountPosition = async (tradePair, positionData) => {
  const position = (await checkPosition(tradePair)).at(0);
  let unRealizedProfit = +position.unRealizedProfit;
  let positionAmt = +position.positionAmt;
  let positionPrice = +position.entryPrice;
  let positionPlaced = Math.abs(positionAmt);

  return {
    ...positionData,
    positionAmt,
    positionPrice,
    positionPlaced,
    unRealizedProfit,
  };
};

///////////////////////////////////////////////////////////////////////////////////////////////////
exports.setTPSL = (positionData, type) => {
  let {
    stopLossPrice,
    loopFinalPrice,
    positionPrice,
    defaultStopLossPer,
    targetProfitPrice,
    targetRewardRatio,
    defaultTargetProfitPer,
  } = positionData;

  if (loopFinalPrice === null) {
    let [previousFinalPrice, previousTargetRewardRatio] = readFileSync(
      "./utils/PreviousPosition.txt"
    )
      .toString("ascii")
      .split("\n");

    loopFinalPrice = previousFinalPrice;
    targetRewardRatio = previousTargetRewardRatio;
  }

  if (type === "SHORT") {
    // Set stop loss Price = entryPrice + (HighestPrice - entryPrice) === HIGHEST PRICE
    stopLossPrice = loopFinalPrice || positionPrice * (1 + defaultStopLossPer);

    // Set target profit Price = entryPrice - (HighestPrice - entryPrice) * targetRewardRatio
    targetProfitPrice = loopFinalPrice
      ? positionPrice - (loopFinalPrice - positionPrice) * targetRewardRatio
      : positionPrice * (1 - defaultTargetProfitPer);
  } else {
    // Set stop loss Price = entryPrice + (LowestPrice - entryPrice) === LOWEST PRICE
    stopLossPrice = loopFinalPrice || positionPrice * (1 - defaultStopLossPer);

    // Set target profit Price = entryPrice - (LowestPrice - entryPrice) * targetRewardRatio
    targetProfitPrice = loopFinalPrice
      ? positionPrice - (loopFinalPrice - positionPrice) * targetRewardRatio
      : positionPrice * (1 + defaultTargetProfitPer);
  }

  if (!loopFinalPrice && loopFinalPrice !== 0) {
    console.log(
      `As system down previously and no records on previous position, current SL: ${stopLossPrice}, TP: ${targetProfitPrice}`
    );
  }

  return { ...positionData, stopLossPrice, targetProfitPrice };
};

///////////////////////////////////////////////////////////////////////////////////////////////////
exports.positionFilled = async (
  tradePair,
  positionData,
  side,
  type,
  loopInterval
) => {
  // clear interval
  clearInterval(loopInterval);

  let { stopLossPrice, targetProfitPrice, loopFinalPrice, positionPlaced } =
    positionData;

  // Fill market to close SHORT position
  const orderResponse = await newOrderMarket(
    tradePair,
    `${side === "SHORT" ? "BUY" : "SELL"}`,
    positionPlaced
  );

  console.log(
    `${new Date()} ${type === "SL" ? "Stop Loss" : "Take Profit"}: Quantity = ${
      orderResponse.origQty
    }`
  );

  // reset stop loss, target profit and loop final price
  stopLossPrice = targetProfitPrice = loopFinalPrice = "";

  return { ...positionData, stopLossPrice, targetProfitPrice, loopFinalPrice };
};

///////////////////////////////////////////////////////////////////////////////////////////////////
exports.orderFilled = async (tradePair, side, orderQuantity, loopInterval) => {
  // Clear interval
  clearInterval(loopInterval);

  // Filed order
  const orderResponse = await newOrderMarket(
    tradePair,
    `${side === "long" ? "BUY" : "SELL"}`,
    orderQuantity
  );

  console.log(
    `${new Date()} ${side === "long" ? "BUY" : "SELL"}: Quantity = ${
      orderResponse?.origQty
    }`
  );
};

///////////////////////////////////////////////////////////////////////////////////////////////////
exports.clearLoop = (
  positionData,
  loopInterval,
  type,
  stopLossPercentage = null
) => {
  let { loopFinalPrice } = positionData;

  clearInterval(loopInterval);
  loopFinalPrice = "";

  if (type === "counter") {
    console.log(
      `${loopStopCandleCounter} candle has passed and no order made, return to watch mode!`
    );
  } else if (type === "globalEMA") {
    console.log(
      `Runtime has stopped due to closing price is closed to ${(
        global4hNonTradeRestriction * 100
      ).toFixed(2)}% of Global EMA`
    );
  } else if (type === "SLper") {
    console.log(
      `Runtime has stopped due to stop loss percentage is < ${(
        lowestStopLossPer * 100
      ).toFixed(2)}% or > ${(highestStopLossPer * 100).toFixed(
        2
      )}%: Current percentage - ${(stopLossPercentage * 100).toFixed(2)}%`
    );
  }

  return { ...positionData, loopFinalPrice };
};

///////////////////////////////////////////////////////////////////////////////////////////////////
exports.setOrderSLPrice = (positionData, loopCounter, priceArr, type) => {
  let { loopFinalPrice } = positionData;

  // to set lowest price for the 1st candle(stop loss price)

  if (type === "long") {
    if (loopCounter === 1) {
      loopFinalPrice = priceArr[0] < priceArr[1] ? priceArr[0] : priceArr[1];
    } else {
      // to set lowest price for the prev candle(stop loss price)
      loopFinalPrice =
        priceArr[1] < loopFinalPrice ? priceArr[1] : loopFinalPrice;
    }

    // to set lowest price if current candle < prev candle
    if (priceArr[0] < loopFinalPrice) {
      loopFinalPrice = priceArr[0];
    }
  } else {
    // to set highest price for the 1st candle(stop loss price)
    if (loopCounter === 1) {
      loopFinalPrice = priceArr[0] > priceArr[1] ? priceArr[0] : priceArr[1];
    } else {
      // to set highest price for prev candle(stop loss price)
      loopFinalPrice =
        priceArr[1] > loopFinalPrice ? priceArr[1] : loopFinalPrice;
    }

    // to set highest price if current candle > prev candle
    if (priceArr[0] > loopFinalPrice) {
      loopFinalPrice = priceArr[0];
    }
  }

  return { ...positionData, loopFinalPrice };
};

///////////////////////////////////////////////////////////////////////////////////////////////////
exports.orderPriceAndQuantity = (closingPrice, positionData, side) => {
  // Calculate Stop Loss percentage
  let stopLossPercentage;
  let { loopFinalPrice } = positionData;

  if (side === "long") {
    stopLossPercentage = (closingPrice - loopFinalPrice) / closingPrice;
  } else {
    stopLossPercentage = (loopFinalPrice - closingPrice) / closingPrice;
  }

  // To calculate 1R (Risk and reward)
  let nextOrderPrice = riskStopLossPrice / stopLossPercentage;

  // If order price < 11, order price === 11
  if (nextOrderPrice < 11) {
    nextOrderPrice = 11;
  }

  // To calculate order quantity
  let orderQuantity = (nextOrderPrice / closingPrice).toFixed(decimalToFixed);

  return { stopLossPercentage, orderQuantity };
};

///////////////////////////////////////////////////////////////////////////////////////////////////
exports.changeTargetRewardRatio = (positionData, stopLossPercentage) => {
  const { highestStopLossPer, ChangeRewardRatioPer } = orderData;
  let { targetRewardRatio, loopFinalPrice } = positionData;

  // If SL% > 0.35% and < 0.4%, change TP% to 1.5R
  if (
    stopLossPercentage >= ChangeRewardRatioPer &&
    stopLossPercentage <= highestStopLossPer
  ) {
    targetRewardRatio = 1.5;
    console.log(
      `As the current SL% is ${(stopLossPercentage * 100).toFixed(
        2
      )}%, hence reward ratio changed to ${targetRewardRatio} `
    );
  } else {
    // Set back to default 2R
    targetRewardRatio = 2;
  }

  // to record loopFinalPrice and Target Reward Ratio
  writeFileSync(
    "./utils/PreviousPosition.txt",
    `${loopFinalPrice}\n${targetRewardRatio}`
  );

  return { ...positionData, targetRewardRatio };
};

///////////////////////////////////////////////////////////////////////////////////////////////////
exports.calculateDate = (accountData, positionData, type) => {
  let { defaultCommission, timeRemaining } = accountData;
  let { targetRewardRatio } = positionData;

  let [PNLDate, culmulativePNL] = readFileSync("./utils/CulmulativePNL.txt")
    .toString("ascii")
    .split("\n");

  let PNLday;
  if (PNLDate !== "null") {
    PNLday = PNLDate.toString().split(" ").at(2);
  }

  const currentDate = new Date();
  const currentDay = currentDate.toString().split(" ").at(2);

  let currentPNL;

  // check for TP or SL
  if (type === "SL") {
    currentPNL = -(1 + defaultCommission);
  } else {
    currentPNL = targetRewardRatio - defaultCommission;
  }

  // If current date !== PNL date, current date = PNL date
  if (PNLday !== currentDay) {
    culmulativePNL = currentPNL;
  } else {
    culmulativePNL = +culmulativePNL + currentPNL;
  }

  writeFileSync(
    "./utils/CulmulativePNL.txt",
    `${currentDate}\n${culmulativePNL}`
  );

  if (culmulativePNL >= (targetRewardRatio - defaultCommission) * 2) {
    const temporaryNextDate = +currentDate + 1000 * 60 * 60 * 24;
    const temporaryNextDateArr = new Date(temporaryNextDate)
      .toString()
      .split(" ");

    temporaryNextDateArr[4] = "00:00:00";
    const nextDateString = temporaryNextDateArr.join(" ");
    const nextDate = new Date(nextDateString);

    timeRemaining = nextDate - currentDate;

    console.log(
      `As 3.5 Reward ratio made, hence system restart in ${nextDate.toString()}`
    );

    return { ...accountData, timeRemaining };
  } else {
    // return 2000 miliseconds
    timeRemaining = 2000;
    return { ...accountData, timeRemaining };
  }
};
