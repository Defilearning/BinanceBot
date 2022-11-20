exports.accountData = {
  accountFiat: "BUSD",
  accountMargin: "ISOLATED",
  accountLeverage: 50,
  tradePair: "BTCBUSD",
  defaultCommission: 0.24,
  timeRemaining: 2000,
};

exports.orderData = {
  lowestStopLossPer: 0.0011,
  ChangeRewardRatioPer: 0.0035,
  highestStopLossPer: 0.004,
  riskStopLossPrice: 3,
  decimalToFixed: 3,
  global4hNonTradeRestriction: 0.0025,
  OrderIntervalMin: 1,
  orderTimeFrame: "1m",
  nearEMAPer: 0.001,
  nearEMAStopCounter: 3,
};

exports.positionData = {
  defaultStopLossPer: 0.0022,
  defaultTargetProfitPer: 0.0044,
  targetRewardRatio: 2,
  positionIntervalSec: 1,
  targetProfitPrice: null,
  stopLossPrice: null,
  loopFinalPrice: null,
};

exports.loopStopCandleCounter = 7;
exports.loopInterval = null;
